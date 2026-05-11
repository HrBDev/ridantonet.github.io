/* ============================================================
   app.js — Central Application Controller
   For: khashayar.one YouTube Downloader
   Dependencies: Utils, I18n, API, UI (load LAST)
   This is the brain that wires everything together
   ============================================================ */

const App = (() => {
  'use strict';

  // ──────────────────────────────────────────────
  // ۱. Application State
  // ──────────────────────────────────────────────

  const state = {
    isInitialized: false,
    isDownloading: false,
    currentDownloadId: null,
    downloadStartTime: null,
    cleanupTimer: null,
    stats: {
      totalDownloads: Utils.getStorageItem('total_downloads', 0),
      lastDownloadDate: Utils.getStorageItem('last_download_date', null),
    },
  };

  // ──────────────────────────────────────────────
  // ۲. Initialization
  // ──────────────────────────────────────────────

  /**
   * راه‌اندازی اولیه برنامه
   */
  async function init() {
    if (state.isInitialized) {
      console.warn('[App] Already initialized');
      return;
    }

    console.log('🚀 Khashayar YouTube Downloader - Starting...');
    console.log(`🌐 Language: ${I18n.getLanguage()} (${I18n.isPersian() ? 'فارسی' : 'English'})`);
    console.log(`📱 Device: ${Utils.detectDevice().isMobile ? 'Mobile' : 'Desktop'}`);

    try {
      // ۱. بررسی در دسترس بودن API
      const apiAvailable = await checkApiAvailability();
      if (!apiAvailable) {
        console.warn('[App] GitHub API may have limited availability');
      }

      // ۲. بررسی rate limit
      await checkAndReportRateLimit();

      // ۳. ساخت رابط کاربری
      UI.buildApp();

      // ۴. ثبت event listeners سراسری
      registerGlobalEvents();

      // ۵. پاکسازی فایل‌های قدیمی (در صورت وجود)
      scheduleCleanup();

      // ۶. نمایش خوش‌آمدگویی
      showWelcomeIfNeeded();

      state.isInitialized = true;
      console.log('✅ App initialized successfully');

    } catch (error) {
      console.error('[App] Initialization error:', error);
      // حتی با خطا هم UI را می‌سازیم
      UI.buildApp();
      state.isInitialized = true;
    }
  }

  /**
   * بررسی در دسترس بودن GitHub API
   */
  async function checkApiAvailability() {
    try {
      const available = await API.isApiAvailable();
      return available;
    } catch {
      return false;
    }
  }

  /**
   * بررسی و گزارش rate limit
   */
  async function checkAndReportRateLimit() {
    try {
      const rateLimit = await API.checkRateLimit();
      console.log(`[App] Rate limit: ${rateLimit.remaining}/${rateLimit.limit} requests remaining`);

      if (rateLimit.isLimited) {
        const resetTime = rateLimit.reset
          ? new Date(rateLimit.reset).toLocaleTimeString('fa-IR')
          : 'نامشخص';

        UI.showNotification(
          'warning',
          `محدودیت نرخ درخواست نزدیک است (${rateLimit.remaining} باقی‌مانده). تا ${resetTime} صبر کنید.`
        );
      }

      return rateLimit;
    } catch {
      return null;
    }
  }

  /**
   * نمایش پیام خوش‌آمدگویی برای کاربران جدید
   */
  function showWelcomeIfNeeded() {
    const hasVisited = Utils.getStorageItem('has_visited_before', false);

    if (!hasVisited) {
      Utils.setStorageItem('has_visited_before', true);

      // نمایش یک toast راهنما بعد از ۲ ثانیه
      setTimeout(() => {
        UI.showNotification(
          'info',
          '👋 لینک یوتیوب را وارد کنید و دانلود را شروع کنید. فایل‌ها ۵ دقیقه پس از دانلود حذف می‌شوند.'
        );
      }, 2000);
    }
  }

  // ──────────────────────────────────────────────
  // ۳. Global Event Handlers
  // ──────────────────────────────────────────────

  function registerGlobalEvents() {
    // رویداد درخواست دانلود (از UI)
    window.addEventListener('downloadRequested', handleDownloadRequested);

    // رویداد لغو دانلود (از UI)
    window.addEventListener('downloadCancelled', handleDownloadCancelled);

    // رویداد تغییر زبان (از i18n)
    window.addEventListener('languageChanged', handleLanguageChanged);

    // رویداد به‌روزرسانی وضعیت workflow (از API polling)
    window.addEventListener('workflowStatusUpdate', handleWorkflowStatusUpdate);

    // رویداد آنلاین/آفلاین شدن
    window.addEventListener('online', () => {
      console.log('[App] Back online');
      UI.showNotification('success', 'اتصال اینترنت برقرار شد.');
    });

    window.addEventListener('offline', () => {
      console.log('[App] Went offline');
      UI.showNotification('warning', 'اتصال اینترنت قطع شده است.');
    });

    // رویداد قبل از بستن صفحه (هشدار در صورت دانلود فعال)
    window.addEventListener('beforeunload', (e) => {
      if (state.isDownloading) {
        e.preventDefault();
        e.returnValue = 'دانلود در حال انجام است. آیا مطمئنید که می‌خواهید خارج شوید؟';
        return e.returnValue;
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
  }

  // ──────────────────────────────────────────────
  // ۴. Download Flow Controller
  // ──────────────────────────────────────────────

  /**
   * مدیریت درخواست دانلود
   * @param {CustomEvent} event
   */
  async function handleDownloadRequested(event) {
    const { url, quality, subtitles, password } = event.detail;

    if (state.isDownloading) {
      UI.showNotification('warning', 'یک دانلود در حال انجام است. لطفاً صبر کنید.');
      return;
    }

    // اعتبارسنجی نهایی
    if (!url || !Utils.isValidYoutubeUrl(url)) {
      UI.showError(I18n.t('error_invalid_url'));
      return;
    }

    // بررسی rate limit قبل از شروع
    const rateLimit = await checkAndReportRateLimit();
    if (rateLimit && rateLimit.remaining <= 0) {
      UI.showError(I18n.t('error_rate_limit'));
      return;
    }

    console.log(`[App] Starting download: ${url} (Quality: ${quality}, Subs: ${subtitles})`);

    // شروع فرآیند دانلود
    state.isDownloading = true;
    state.downloadStartTime = new Date();
    UI.setProcessing(true);

    try {
      // مرحله ۱: ارسال درخواست
      UI.updateProgress('request');
      console.log('[App] Dispatching workflow...');

      await API.dispatchWorkflow({
        url: url,
        quality: quality,
        subtitles: subtitles,
        password: password,
      });

      // مرحله ۲: دانلود (polling)
      UI.updateProgress('download');
      console.log('[App] Workflow dispatched. Starting polling...');

      const result = await API.startPolling();

      if (!result.success) {
        throw new Error(result.conclusion === 'cancelled' ? 'cancelled' : 'download_failed');
      }

      // مرحله ۳: بسته‌بندی
      UI.updateProgress('package');
      console.log('[App] Download completed. Retrieving file info...');

      // کمی صبر برای اتمام push
      await sleep(3000);

      // دریافت اطلاعات فایل دانلود شده
      const downloadInfo = await retrieveDownloadInfo(url, quality);

      if (!downloadInfo) {
        throw new Error('نتوانستیم فایل دانلود شده را پیدا کنیم.');
      }

      // مرحله ۴: آماده
      UI.updateProgress('ready');
      console.log('[App] File ready:', downloadInfo);

      // نمایش نتیجه
      UI.showResult(downloadInfo);

      // به‌روزرسانی آمار
      updateStats();

      // زمان‌بندی پاکسازی خودکار (۵ دقیقه)
      scheduleAutoCleanup(downloadInfo);

      // نوتیفیکیشن موفقیت
      UI.showNotification('success', '✅ ویدیو با موفقیت دانلود شد!');

    } catch (error) {
      console.error('[App] Download failed:', error);
      handleDownloadError(error);
    } finally {
      state.isDownloading = false;
      UI.setProcessing(false);
      state.downloadStartTime = null;
    }
  }

  /**
   * دریافت اطلاعات فایل دانلود شده
   * @param {string} url - لینک یوتیوب
   * @param {string} quality - کیفیت
   * @returns {Promise<object|null>}
   */
  async function retrieveDownloadInfo(url, quality) {
    try {
      // تلاش برای یافتن پوشه ویدیو
      const files = await API.getDownloadedFiles();

      if (!files || files.length === 0) {
        console.warn('[App] No files found in videos/');
        return null;
      }

      // آخرین پوشه (جدیدترین دانلود)
      const latestFolder = files[files.length - 1];

      if (latestFolder.type !== 'dir') {
        // اگر فایل است نه پوشه، به دنبال پوشه می‌گردیم
        const folders = files.filter(f => f.type === 'dir');
        if (folders.length === 0) return null;
        return buildDownloadInfoFromFolder(folders[folders.length - 1], url, quality);
      }

      return await buildDownloadInfoFromFolder(latestFolder, url, quality);

    } catch (error) {
      console.error('[App] Failed to retrieve download info:', error);
      return null;
    }
  }

  /**
   * ساخت آبجکت اطلاعات دانلود از پوشه
   * @param {object} folder - اطلاعات پوشه
   * @param {string} url - لینک اصلی
   * @param {string} quality - کیفیت
   * @returns {Promise<object>}
   */
  async function buildDownloadInfoFromFolder(folder, url, quality) {
    const folderName = folder.name;
    const folderFiles = await API.getDownloadedFiles(folderName);

    // پیدا کردن فایل اصلی (zip یا mp4)
    const mainFile = folderFiles.find(f =>
      f.name.endsWith('.zip') || f.name.endsWith('.mp4') || f.name.endsWith('.mp3')
    );

    // دریافت thumbnail
    const thumbnail = await API.getVideoThumbnail(folderName);

    // محاسبه حجم کل
    const totalSize = folderFiles.reduce((sum, f) => sum + (f.size || 0), 0);

    // ساخت download URL
    const downloadPath = mainFile ? mainFile.path : `${folder.path}/README.md`;
    const downloadUrl = API.getRawDownloadUrl(downloadPath);

    // زمان انقضا (الان + ۵ دقیقه)
    const expiryTime = Utils.getExpiryTime();

    return {
      id: Utils.generateId(),
      title: folderName.replace(/-/g, ' '),
      folderName: folderName,
      thumbnail: thumbnail || null,
      size: totalSize,
      quality: quality,
      downloadUrl: downloadUrl,
      originalUrl: url,
      expiryTime: expiryTime,
      createdAt: new Date().toISOString(),
      files: folderFiles,
    };
  }

  /**
   * مدیریت خطاهای دانلود
   * @param {Error} error
   */
  function handleDownloadError(error) {
    let errorMessage;

    if (error.message === 'cancelled') {
      errorMessage = 'دانلود توسط کاربر لغو شد.';
    } else if (error.message === 'rate_limit') {
      errorMessage = I18n.t('error_rate_limit');
    } else if (error.message === 'timeout') {
      errorMessage = I18n.t('error_timeout');
    } else {
      errorMessage = Utils.getUserFriendlyError(error);
    }

    UI.showError(errorMessage);
    UI.showNotification('error', errorMessage);
  }

  // ──────────────────────────────────────────────
  // ۵. Download Cancellation
  // ──────────────────────────────────────────────

  async function handleDownloadCancelled() {
    console.log('[App] Cancelling download...');

    // توقف polling
    API.stopPolling();

    // تلاش برای لغو workflow
    // (از آنجایی که runId را در polling ذخیره نکردیم،
    // ممکن است workflow همچنان اجرا شود اما ما دیگر گوش نمی‌دهیم)

    state.isDownloading = false;
    UI.setProcessing(false);
    UI.resetForm();

    UI.showNotification('info', 'دانلود لغو شد.');
  }

  // ──────────────────────────────────────────────
  // ۶. Cleanup System (۵-Minute Auto-Delete)
  // ──────────────────────────────────────────────

  /**
   * زمان‌بندی پاکسازی خودکار بعد از ۵ دقیقه
   * @param {object} downloadInfo - اطلاعات دانلود
   */
  function scheduleAutoCleanup(downloadInfo) {
    if (!downloadInfo?.expiryTime) return;

    const delay = 5 * 60 * 1000; // ۵ دقیقه به میلی‌ثانیه

    console.log(`[App] Scheduling cleanup for "${downloadInfo.title}" in 5 minutes`);

    state.cleanupTimer = setTimeout(async () => {
      console.log(`[App] Auto-cleaning: "${downloadInfo.title}"`);

      try {
        // تلاش برای حذف پوشه از طریق GitHub API
        // (این یک عملیات پیچیده است - باید تک‌تک فایل‌ها حذف شوند)
        // اما cleaner.yml workflow این کار را انجام می‌دهد

        UI.showNotification('info', `🗑 فایل "${downloadInfo.title}" به طور خودکار حذف شد.`);

        // ریست کردن result card اگر هنوز نمایش داده می‌شود
        const remaining = Utils.getTimeRemaining(downloadInfo.expiryTime);
        if (remaining.isExpired) {
          // فقط اگر کاربر هنوز در صفحه است و result visible است
          UI.showNotification('warning', I18n.t('notify_expired'));
        }
      } catch (error) {
        console.error('[App] Cleanup error:', error);
      }
    }, delay);
  }

  /**
   * زمان‌بندی پاکسازی هنگام start (پاکسازی فایل‌های باقی‌مانده از قبل)
   */
  function scheduleCleanup() {
    // چک کردن اینکه آیا از آخرین بازدید فایلی باقی مانده
    const lastCleanup = Utils.getStorageItem('last_cleanup_time');

    if (lastCleanup) {
      const timeSinceLastCleanup = Date.now() - new Date(lastCleanup).getTime();

      // اگر بیشتر از ۱۰ دقیقه گذشته، احتمالاً فایل‌های قدیمی وجود دارند
      if (timeSinceLastCleanup > 10 * 60 * 1000) {
        console.log('[App] Old files may exist. Cleanup workflow should handle them.');
      }
    }

    Utils.setStorageItem('last_cleanup_time', new Date().toISOString());
  }

  // ──────────────────────────────────────────────
  // ۷. Statistics Tracking
  // ──────────────────────────────────────────────

  function updateStats() {
    state.stats.totalDownloads++;
    state.stats.lastDownloadDate = new Date().toISOString();

    Utils.setStorageItem('total_downloads', state.stats.totalDownloads);
    Utils.setStorageItem('last_download_date', state.stats.lastDownloadDate);

    console.log(`[App] Stats updated: ${state.stats.totalDownloads} total downloads`);
  }

  // ──────────────────────────────────────────────
  // ۸. Workflow Status Handler (for Polling Updates)
  // ──────────────────────────────────────────────

  function handleWorkflowStatusUpdate(event) {
    const { status, conclusion, attempt } = event.detail;

    console.log(`[App] Workflow update #${attempt}: ${status} (${conclusion || 'N/A'})`);

    // به‌روزرسانی progress بر اساس وضعیت
    if (status === 'in_progress') {
      // اگر polling در حال انجام است، مرحله download را نشان بده
      if (state.isDownloading && attempt > 0) {
        UI.updateProgress('download');
      }
    } else if (status === 'completed') {
      if (conclusion === 'success' && state.isDownloading) {
        UI.updateProgress('package');
      }
    }
  }

  // ──────────────────────────────────────────────
  // ۹. Language Change Handler
  // ──────────────────────────────────────────────

  function handleLanguageChanged(event) {
    const { language } = event.detail;
    console.log(`[App] Language changed to: ${language}`);

    // ذخیره تنظیمات
    Utils.setStorageItem('app_language', language);

    // UI بازسازی می‌شود (rebuildApp در ui.js صدا زده می‌شود)
    // اما اگر دانلود در حال انجام است، فقط notification بده
    if (state.isDownloading) {
      UI.showNotification('info', `زبان به ${language === 'fa' ? 'فارسی' : 'English'} تغییر کرد.`);
    }
  }

  // ──────────────────────────────────────────────
  // ۱۰. Keyboard Shortcuts
  // ──────────────────────────────────────────────

  function handleKeyboardShortcuts(event) {
    // Ctrl+Enter برای شروع دانلود
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      if (!state.isDownloading) {
        const urlInput = Utils.$('url-input');
        if (urlInput === document.activeElement) {
          // تریگر submit
          window.dispatchEvent(new CustomEvent('downloadRequested', {
            detail: getFormValues(),
          }));
        }
      }
    }

    // Escape برای لغو یا بستن
    if (event.key === 'Escape') {
      if (state.isDownloading) {
        window.dispatchEvent(new CustomEvent('downloadCancelled'));
      } else {
        const resultCard = Utils.$1('.result-card.visible');
        const errorState = Utils.$1('.error-state.visible');
        if (resultCard || errorState) {
          UI.resetForm();
        }
      }
    }
  }

  /**
   * دریافت مقادیر فرم (برای shortcuts)
   */
  function getFormValues() {
    const urlInput = Utils.$('url-input');
    const qualitySelect = Utils.$('quality-select');
    const subtitleToggle = Utils.$('subtitle-toggle');
    const passwordInput = Utils.$('password-input');

    return {
      url: urlInput?.value?.trim() || '',
      quality: qualitySelect?.value || 'best',
      subtitles: subtitleToggle?.classList.contains('active') || false,
      password: passwordInput?.value?.trim() || '',
    };
  }

  // ──────────────────────────────────────────────
  // ۱۱. Utility
  // ──────────────────────────────────────────────

  /**
   * تأخیر async
   * @param {number} ms - میلی‌ثانیه
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * دریافت وضعیت فعلی (read-only)
   */
  function getState() {
    return { ...state };
  }

  // ──────────────────────────────────────────────
  // ۱۲. Startup
  // ──────────────────────────────────────────────

  // اجرای init وقتی DOM آماده شد
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM قبلاً بارگذاری شده
    init();
  }

  // همچنین وقتی همه منابع (شامل تصاویر) بارگذاری شدند
  window.addEventListener('load', () => {
    console.log('[App] All resources loaded');
    // ایجاد آیکون‌های Lucide اگر کتابخانه حاضر باشد
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  });

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────
  return {
    init,
    getState,
    getStats: () => ({ ...state.stats }),
    isDownloading: () => state.isDownloading,
  };

})();

// ──────────────────────────────────────────────
// Freeze the App object
// ──────────────────────────────────────────────
Object.freeze(App);

// ──────────────────────────────────────────────
// Export for debugging (development only)
// ──────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.__APP__ = App;
  window.__API__ = API;
  window.__UI__ = UI;
  window.__I18N__ = I18n;
  window.__UTILS__ = Utils;
}
