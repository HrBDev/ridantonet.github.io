/* ============================================================
   api.js — GitHub API Communication & Workflow Management
   For: khashayar.one YouTube Downloader
   Dependencies: Utils (utils.js), I18n (i18n.js)
   Must be loaded BEFORE: ui.js, app.js
   ============================================================ */

const API = (() => {
  'use strict';

  // ──────────────────────────────────────────────
  // ۱. Configuration
  // ──────────────────────────────────────────────

  const CONFIG = {
    // GitHub Repository Info
    owner: 'khashayardev',
    repo: 'khashayardev.github.io',
    branch: 'main',

    // API Endpoints
    baseUrl: 'https://api.github.com',
    workflowFileName: 'yt-dl.yml',

    // Polling Settings
    pollInterval: 5000,        // هر ۵ ثانیه چک کن
    maxPollAttempts: 120,      // حداکثر ۱۰ دقیقه (120 × 5s)
    pollBackoffMultiplier: 1.2, // افزایش تدریجی فاصله polling

    // Timeout Settings
    requestTimeout: 15000,     // ۱۵ ثانیه برای هر درخواست
    workflowTimeout: 600000,   // ۱۰ دقیقه حداکثر زمان دانلود

    // Rate Limit Buffer
    rateLimitBuffer: 5,        // حداقل درخواست باقی‌مانده قبل از هشدار
  };

  // ──────────────────────────────────────────────
  // ۲. State Management
  // ──────────────────────────────────────────────

  let currentWorkflowRunId = null;
  let isPolling = false;
  let pollTimer = null;
  let pollAttempts = 0;
  let currentPollInterval = CONFIG.pollInterval;
  let abortController = null;

  // ──────────────────────────────────────────────
  // ۳. Core API Request Function
  // ──────────────────────────────────────────────

  /**
   * درخواست به GitHub API با مدیریت خطا و rate limit
   * @param {string} endpoint - مسیر API
   * @param {object} options - تنظیمات fetch
   * @returns {Promise<object>} - پاسخ API
   */
  async function apiRequest(endpoint, options = {}) {
    // بررسی اتصال اینترنت
    if (!Utils.isOnline()) {
      throw new Error('no_connection');
    }

    // ایجاد AbortController برای timeout
    abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), CONFIG.requestTimeout);

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${CONFIG.baseUrl}${endpoint}`;

    const defaultHeaders = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Khashayar-YouTube-Downloader/2.0',
    };

    // اضافه کردن توکن اگر موجود باشد (از متغیر محیطی یا localStorage)
    const token = getToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {}),
        },
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      // بررسی Rate Limit
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');

      if (rateLimitRemaining && parseInt(rateLimitRemaining) <= CONFIG.rateLimitBuffer) {
        const resetDate = rateLimitReset
          ? new Date(parseInt(rateLimitReset) * 1000)
          : new Date(Date.now() + 3600000);

        const waitMinutes = Math.ceil((resetDate - new Date()) / 60000);
        console.warn(`[API] Rate limit low (${rateLimitRemaining} remaining). Resets in ${waitMinutes} min.`);

        // ذخیره زمان reset
        Utils.setStorageItem('rate_limit_reset', resetDate.toISOString());
      }

      // مدیریت خطاهای HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createHttpError(response.status, errorData);
      }

      // برای ۲۰۴ No Content (مثل workflow dispatch)
      if (response.status === 204) {
        return { success: true, status: 204 };
      }

      // بازگرداندن JSON
      const data = await response.json();
      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('timeout');
      }

      throw error;
    }
  }

  /**
   * دریافت توکن گیت‌هاب
   * @returns {string|null}
   */
  function getToken() {
    // اولویت: environment variable > localStorage
    // نکته: در production، توکن باید از طریق متغیر محیطی یا یک backend proxy تأمین شود
    const envToken = (typeof GITHUB_TOKEN !== 'undefined') ? GITHUB_TOKEN : null;
    const storedToken = Utils.getStorageItem('github_token');

    return envToken || storedToken || null;
  }

  /**
   * ایجاد خطای HTTP با پیام مناسب
   * @param {number} status - کد وضعیت
   * @param {object} data - داده خطا
   * @returns {Error}
   */
  function createHttpError(status, data) {
    const message = data.message || `HTTP ${status}`;

    const error = new Error(message);
    error.status = status;
    error.githubMessage = message;

    switch (status) {
      case 401:
        error.userMessage = 'خطا در احراز هویت. لطفاً توکن گیت‌هاب را بررسی کنید.';
        break;
      case 403:
        error.userMessage = 'محدودیت نرخ درخواست. لطفاً چند دقیقه صبر کنید.';
        break;
      case 404:
        error.userMessage = 'منبع مورد نظر یافت نشد.';
        break;
      case 422:
        error.userMessage = 'درخواست نامعتبر است. پارامترها را بررسی کنید.';
        break;
      case 500:
      case 502:
      case 503:
        error.userMessage = 'خطای سرور گیت‌هاب. لطفاً بعداً تلاش کنید.';
        break;
      default:
        error.userMessage = `خطای سرور (${status})`;
    }

    return error;
  }

  // ──────────────────────────────────────────────
  // ۴. Workflow Dispatch (Trigger Download)
  // ──────────────────────────────────────────────

  /**
   * اجرای ورک‌فلو دانلود
   * @param {object} params - پارامترهای دانلود
   * @param {string} params.url - لینک یوتیوب
   * @param {string} params.quality - کیفیت
   * @param {boolean} params.subtitles - دانلود زیرنویس؟
   * @param {string} params.password - رمز (اختیاری)
   * @returns {Promise<boolean>} - موفقیت‌آمیز بودن
   */
  async function dispatchWorkflow({ url, quality = 'best', subtitles = false, password = '' }) {
    const endpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}/actions/workflows/${CONFIG.workflowFileName}/dispatches`;

    const body = {
      ref: CONFIG.branch,
      inputs: {
        youtube_urls: url,
        quality: quality,
        download_subtitles: subtitles ? 'true' : 'false',
        password: password || '',
      },
    };

    try {
      await apiRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      console.log('[API] Workflow dispatched successfully');
      return true;

    } catch (error) {
      console.error('[API] Failed to dispatch workflow:', error);
      throw error;
    }
  }

  // ──────────────────────────────────────────────
  // ۵. Polling Workflow Status
  // ──────────────────────────────────────────────

  /**
   * دریافت آخرین ورک‌فلو ران
   * @returns {Promise<object>} - اطلاعات ورک‌فلو ران
   */
  async function getLatestWorkflowRun() {
    const endpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}/actions/runs?workflow_id=${CONFIG.workflowFileName}&branch=${CONFIG.branch}&per_page=1&status=in_progress`;

    try {
      // اول تلاش برای ران‌های در حال اجرا
      let data = await apiRequest(endpoint);

      if (data.workflow_runs && data.workflow_runs.length > 0) {
        return data.workflow_runs[0];
      }

      // اگر ران در حال اجرایی نبود، آخرین ران انجام شده را بگیر
      const completedEndpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}/actions/runs?workflow_id=${CONFIG.workflowFileName}&branch=${CONFIG.branch}&per_page=1&status=completed`;
      data = await apiRequest(completedEndpoint);

      if (data.workflow_runs && data.workflow_runs.length > 0) {
        return data.workflow_runs[0];
      }

      return null;

    } catch (error) {
      console.error('[API] Failed to get workflow runs:', error);
      return null;
    }
  }

  /**
   * دریافت وضعیت یک ورک‌فلو ران خاص
   * @param {number} runId - شناسه ورک‌فلو
   * @returns {Promise<object>} - وضعیت ورک‌فلو
   */
  async function getWorkflowRunStatus(runId) {
    const endpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}/actions/runs/${runId}`;

    try {
      const data = await apiRequest(endpoint);
      return data;
    } catch (error) {
      console.error(`[API] Failed to get run status for ${runId}:`, error);
      return null;
    }
  }

  /**
   * شروع polling برای وضعیت ورک‌فلو
   * @returns {Promise<object>} - نتیجه نهایی
   */
  async function startPolling() {
    return new Promise((resolve, reject) => {
      isPolling = true;
      pollAttempts = 0;
      currentPollInterval = CONFIG.pollInterval;

      // صبر کوتاه برای اینکه workflow register بشه
      setTimeout(() => {
        pollWorkflow(resolve, reject);
      }, 3000);
    });
  }

  /**
   * یک چرخه polling
   * @param {Function} resolve - تابع resolve promise
   * @param {Function} reject - تابع reject promise
   */
  async function pollWorkflow(resolve, reject) {
    if (!isPolling) {
      reject(new Error('Polling cancelled'));
      return;
    }

    pollAttempts++;

    // بررسی حداکثر تعداد تلاش
    if (pollAttempts >= CONFIG.maxPollAttempts) {
      isPolling = false;
      reject(new Error('timeout'));
      return;
    }

    try {
      // دریافت وضعیت
      const status = await getLatestWorkflowRun();

      if (!status) {
        // هنوز رانی پیدا نشده، منتظر می‌مانیم
        scheduleNextPoll(resolve, reject);
        return;
      }

      // ذخیره runId برای استفاده‌های بعدی
      if (!currentWorkflowRunId && status.id) {
        currentWorkflowRunId = status.id;
      }

      console.log(`[API] Poll #${pollAttempts}: Status="${status.status}", Conclusion="${status.conclusion}"`);

      // ارسال وضعیت به UI از طریق رویداد
      window.dispatchEvent(new CustomEvent('workflowStatusUpdate', {
        detail: {
          status: status.status,
          conclusion: status.conclusion,
          runId: status.id,
          htmlUrl: status.html_url,
          attempt: pollAttempts,
        },
      }));

      // بررسی وضعیت نهایی
      if (status.status === 'completed') {
        isPolling = false;

        if (status.conclusion === 'success') {
          resolve({
            success: true,
            runId: status.id,
            htmlUrl: status.html_url,
          });
        } else {
          resolve({
            success: false,
            conclusion: status.conclusion,
            runId: status.id,
            htmlUrl: status.html_url,
          });
        }
        return;
      }

      // هنوز در حال اجراست
      scheduleNextPoll(resolve, reject);

    } catch (error) {
      console.error(`[API] Poll error (attempt ${pollAttempts}):`, error);

      // خطاهای شبکه را تحمل می‌کنیم و ادامه می‌دهیم
      if (error.message === 'timeout' || error.message === 'no_connection' || error.message.includes('Failed to fetch')) {
        console.warn('[API] Network error during poll, will retry...');
        scheduleNextPoll(resolve, reject);
      } else if (error.status === 403 && pollAttempts > 20) {
        // بعد از ۲۰ تلاش، rate limit error قابل قبول نیست
        isPolling = false;
        reject(new Error('rate_limit'));
      } else {
        scheduleNextPoll(resolve, reject);
      }
    }
  }

  /**
   * زمان‌بندی polling بعدی با backoff
   * @param {Function} resolve
   * @param {Function} reject
   */
  function scheduleNextPoll(resolve, reject) {
    if (!isPolling) return;

    // افزایش تدریجی فاصله polling با backoff
    if (pollAttempts > 10) {
      currentPollInterval = Math.min(
        CONFIG.pollInterval * Math.pow(CONFIG.pollBackoffMultiplier, pollAttempts - 10),
        30000 // حداکثر ۳۰ ثانیه
      );
    }

    pollTimer = setTimeout(() => {
      pollWorkflow(resolve, reject);
    }, currentPollInterval);
  }

  /**
   * توقف polling
   */
  function stopPolling() {
    isPolling = false;

    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }

    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    currentWorkflowRunId = null;
    pollAttempts = 0;
    currentPollInterval = CONFIG.pollInterval;

    console.log('[API] Polling stopped');
  }

  // ──────────────────────────────────────────────
  // ۶. Download Result Retrieval
  // ──────────────────────────────────────────────

  /**
   * دریافت لیست فایل‌های دانلود شده از پوشه videos
   * @param {string} folderName - نام پوشه (اختیاری)
   * @returns {Promise<Array>} - لیست فایل‌ها
   */
  async function getDownloadedFiles(folderName = null) {
    let endpoint;

    if (folderName) {
      // دریافت محتوای یک پوشه خاص
      endpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}/contents/videos/${encodeURIComponent(folderName)}?ref=${CONFIG.branch}`;
    } else {
      // دریافت لیست پوشه‌ها
      endpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}/contents/videos?ref=${CONFIG.branch}`;
    }

    try {
      const data = await apiRequest(endpoint);

      if (Array.isArray(data)) {
        return data.map(file => ({
          name: file.name,
          path: file.path,
          url: file.download_url,
          size: file.size,
          type: file.type,
          sha: file.sha,
        }));
      }

      return [];
    } catch (error) {
      if (error.status === 404) {
        console.log('[API] No videos folder found yet');
        return [];
      }
      console.error('[API] Failed to get downloaded files:', error);
      return [];
    }
  }

  /**
   * دریافت لینک دانلود مستقیم یک فایل
   * @param {string} filePath - مسیر فایل در ریپو
   * @returns {string} - لینک raw
   */
  function getRawDownloadUrl(filePath) {
    return `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/${filePath}`;
  }

  /**
   * دریافت محتوای README.md یک ویدیو
   * @param {string} folderName - نام پوشه ویدیو
   * @returns {Promise<string>} - محتوای README
   */
  async function getVideoReadme(folderName) {
    const endpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}/contents/videos/${encodeURIComponent(folderName)}/README.md?ref=${CONFIG.branch}`;

    try {
      const data = await apiRequest(endpoint);

      if (data.content && data.encoding === 'base64') {
        return atob(data.content);
      }

      return null;
    } catch (error) {
      console.error(`[API] Failed to get README for ${folderName}:`, error);
      return null;
    }
  }

  /**
   * دریافت thumbnail یک ویدیو
   * @param {string} folderName - نام پوشه ویدیو
   * @returns {Promise<string|null>} - لینک thumbnail
   */
  async function getVideoThumbnail(folderName) {
    const endpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}/contents/videos/${encodeURIComponent(folderName)}/thumbnail.jpg?ref=${CONFIG.branch}`;

    try {
      const data = await apiRequest(endpoint);
      return data.download_url || null;
    } catch (error) {
      // thumbnail اختیاری است
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // ۷. Rate Limit Check
  // ──────────────────────────────────────────────

  /**
   * بررسی وضعیت Rate Limit
   * @returns {Promise<object>} - اطلاعات rate limit
   */
  async function checkRateLimit() {
    const endpoint = '/rate_limit';

    try {
      const data = await apiRequest(endpoint);
      return {
        remaining: data.rate?.remaining || 0,
        limit: data.rate?.limit || 60,
        reset: data.rate?.reset ? new Date(data.rate.reset * 1000) : null,
        isLimited: (data.rate?.remaining || 0) <= CONFIG.rateLimitBuffer,
      };
    } catch (error) {
      console.error('[API] Failed to check rate limit:', error);
      return {
        remaining: 0,
        limit: 60,
        reset: null,
        isLimited: false,
      };
    }
  }

  // ──────────────────────────────────────────────
  // ۸. Cleaner: Delete Expired Files
  // ──────────────────────────────────────────────

  /**
   * حذف یک فایل از ریپو (برای cleaner)
   * @param {string} filePath - مسیر فایل
   * @param {string} sha - شناسه فایل (برای حذف نیاز است)
   * @returns {Promise<boolean>}
   */
  async function deleteFile(filePath, sha) {
    const endpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${filePath}`;

    try {
      await apiRequest(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[Auto-Clean] Remove expired download: ${filePath}`,
          sha: sha,
          branch: CONFIG.branch,
        }),
      });

      console.log(`[API] Deleted: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`[API] Failed to delete ${filePath}:`, error);
      return false;
    }
  }

  // ──────────────────────────────────────────────
  // ۹. Workflow Cancellation
  // ──────────────────────────────────────────────

  /**
   * لغو یک ورک‌فلو در حال اجرا
   * @param {number} runId - شناسه ورک‌فلو
   * @returns {Promise<boolean>}
   */
  async function cancelWorkflow(runId) {
    if (!runId) return false;

    const endpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}/actions/runs/${runId}/cancel`;

    try {
      await apiRequest(endpoint, { method: 'POST' });
      stopPolling();
      console.log(`[API] Workflow ${runId} cancelled`);
      return true;
    } catch (error) {
      console.error(`[API] Failed to cancel workflow ${runId}:`, error);
      return false;
    }
  }

  // ──────────────────────────────────────────────
  // ۱۰. Token Management
  // ──────────────────────────────────────────────

  /**
   * ذخیره توکن گیت‌هاب
   * @param {string} token
   */
  function saveToken(token) {
    if (token) {
      Utils.setStorageItem('github_token', token);
    }
  }

  /**
   * حذف توکن ذخیره شده
   */
  function clearToken() {
    Utils.removeStorageItem('github_token');
  }

  /**
   * بررسی وجود توکن
   * @returns {boolean}
   */
  function hasToken() {
    return !!getToken();
  }

  // ──────────────────────────────────────────────
  // ۱۱. Utility
  // ──────────────────────────────────────────────

  /**
   * دریافت اطلاعات مخزن
   * @returns {Promise<object>}
   */
  async function getRepoInfo() {
    const endpoint = `/repos/${CONFIG.owner}/${CONFIG.repo}`;

    try {
      const data = await apiRequest(endpoint);
      return {
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        stars: data.stargazers_count,
        url: data.html_url,
      };
    } catch (error) {
      console.error('[API] Failed to get repo info:', error);
      return null;
    }
  }

  /**
   * بررسی در دسترس بودن API
   * @returns {Promise<boolean>}
   */
  async function isApiAvailable() {
    try {
      const rateLimit = await checkRateLimit();
      return rateLimit.remaining > 0;
    } catch {
      return false;
    }
  }

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────
  return {
    // Workflow
    dispatchWorkflow,
    getLatestWorkflowRun,
    getWorkflowRunStatus,
    startPolling,
    stopPolling,
    cancelWorkflow,

    // Results
    getDownloadedFiles,
    getRawDownloadUrl,
    getVideoReadme,
    getVideoThumbnail,

    // Management
    checkRateLimit,
    deleteFile,
    saveToken,
    clearToken,
    hasToken,
    getRepoInfo,
    isApiAvailable,

    // Config (read-only)
    config: Object.freeze({ ...CONFIG }),
  };

})();

// ──────────────────────────────────────────────
// Freeze the API object
// ──────────────────────────────────────────────
Object.freeze(API);
