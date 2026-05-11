/* ============================================================
   utils.js — Core Utility Functions
   For: khashayar.one YouTube Downloader
   Dependencies: None (standalone)
   Must be loaded BEFORE: api.js, ui.js, app.js
   ============================================================ */

// ──────────────────────────────────────────────
// Namespace Protection
// ──────────────────────────────────────────────
const Utils = (() => {
  'use strict';

  // ──────────────────────────────────────────────
  // ۱. YouTube URL Validation & Parsing
  // ──────────────────────────────────────────────

  /**
   * بررسی معتبر بودن لینک یوتیوب
   * @param {string} url - لینک مورد نظر
   * @returns {boolean} - آیا لینک یوتیوب معتبر است؟
   */
  function isValidYoutubeUrl(url) {
    if (!url || typeof url !== 'string') return false;

    const trimmed = url.trim();

    // الگوهای معتبر یوتیوب
    const patterns = [
      // Standard watch URL
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}/,
      // Short youtu.be URL
      /^https?:\/\/youtu\.be\/[\w-]{11}/,
      // Embed URL
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]{11}/,
      // Shorts URL
      /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]{11}/,
      // Mobile URL
      /^https?:\/\/m\.youtube\.com\/watch\?v=[\w-]{11}/,
      // Music URL
      /^https?:\/\/music\.youtube\.com\/watch\?v=[\w-]{11}/,
    ];

    return patterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * استخراج ID ویدیو از لینک یوتیوب
   * @param {string} url - لینک یوتیوب
   * @returns {string|null} - شناسه ۱۱ کاراکتری ویدیو یا null
   */
  function extractVideoId(url) {
    if (!url) return null;

    const trimmed = url.trim();

    // youtu.be/VIDEO_ID
    const shortMatch = trimmed.match(/youtu\.be\/([\w-]{11})/);
    if (shortMatch) return shortMatch[1];

    // youtube.com/watch?v=VIDEO_ID
    const watchMatch = trimmed.match(/[?&]v=([\w-]{11})/);
    if (watchMatch) return watchMatch[1];

    // youtube.com/embed/VIDEO_ID
    const embedMatch = trimmed.match(/embed\/([\w-]{11})/);
    if (embedMatch) return embedMatch[1];

    // youtube.com/shorts/VIDEO_ID
    const shortsMatch = trimmed.match(/shorts\/([\w-]{11})/);
    if (shortsMatch) return shortsMatch[1];

    return null;
  }

  /**
   * نرمال‌سازی لینک یوتیوب به فرمت استاندارد
   * @param {string} url - لینک یوتیوب
   * @returns {string} - لینک نرمال شده
   */
  function normalizeYoutubeUrl(url) {
    const videoId = extractVideoId(url);
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return url;
  }

  /**
   * تفکیک چند لینک با فاصله
   * @param {string} input - ورودی کاربر (ممکنه چندتا لینک با فاصله باشه)
   * @returns {string[]} - آرایه لینک‌های معتبر
   */
  function parseMultipleUrls(input) {
    if (!input || typeof input !== 'string') return [];

    const raw = input.trim();
    if (!raw) return [];

    // Split by whitespace, newline, or comma
    const urls = raw
      .split(/[\s,\n]+/)
      .map(url => url.trim())
      .filter(url => url.length > 0);

    return urls.map(normalizeYoutubeUrl);
  }

  // ──────────────────────────────────────────────
  // ۲. Text Sanitization & Formatting
  // ──────────────────────────────────────────────

  /**
   * پاکسازی نام فایل از کاراکترهای نامعتبر
   * @param {string} name - نام فایل
   * @returns {string} - نام پاکسازی شده
   */
  function sanitizeFileName(name) {
    if (!name) return 'untitled';

    return name
      .trim()
      // جایگزینی اسپیس و کاراکترهای مشابه با خط تیره
      .replace(/[\s\u00A0\u2000-\u200B\u3000]+/g, '-')
      // حذف کاراکترهای غیرمجاز در نام فایل
      .replace(/[<>:"/\\|?*]/g, '')
      // حذف نقطه از ابتدا و انتها
      .replace(/^\.+|\.+$/g, '')
      // جایگزینی خط تیره‌های متوالی با یک خط تیره
      .replace(/-{2,}/g, '-')
      // کوتاه کردن نام‌های خیلی بلند
      .substring(0, 200) || 'untitled';
  }

  /**
   * محدود کردن طول متن با افزودن ...
   * @param {string} text - متن اصلی
   * @param {number} maxLength - حداکثر طول
   * @returns {string} - متن کوتاه شده
   */
  function truncateText(text, maxLength = 60) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * تبدیل سایز فایل به فرمت خوانا
   * @param {number} bytes - حجم به بایت
   * @returns {string} - حجم فرمت شده
   */
  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '۰ بایت';
    if (bytes < 0) return 'نامشخص';

    const units = ['بایت', 'KB', 'MB', 'GB', 'TB'];
    const isPersian = document.documentElement.lang === 'fa';

    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    const formatted = size % 1 === 0 ? size.toFixed(0) : size.toFixed(1);

    if (isPersian) {
      const persianDigits = formatted.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
      return `${persianDigits} ${units[unitIndex]}`;
    }

    return `${formatted} ${units[unitIndex]}`;
  }

  /**
   * تبدیل ثانیه به فرمت زمان خوانا
   * @param {number} seconds - تعداد ثانیه
   * @returns {string} - زمان فرمت شده
   */
  function formatTime(seconds) {
    if (!seconds || seconds < 0) return '۰:۰۰';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (n) => n.toString().padStart(2, '0');

    if (document.documentElement.lang === 'fa') {
      const toPersian = (n) => n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
      return `${toPersian(mins)}:${toPersian(secs)}`;
    }

    return `${pad(mins)}:${pad(secs)}`;
  }

  // ──────────────────────────────────────────────
  // ۳. Date & Time Utilities
  // ──────────────────────────────────────────────

  /**
   * محاسبه زمان باقی‌مانده تا انقضا
   * @param {Date|string} expiryDate - تاریخ انقضا
   * @returns {object} - شامل minutes, seconds, isExpired, display
   */
  function getTimeRemaining(expiryDate) {
    const now = new Date();
    const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
    const diff = expiry - now;

    if (diff <= 0) {
      return {
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        display: 'منقضی شده',
        displayEn: 'Expired',
      };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const isPersian = document.documentElement.lang === 'fa';

    if (isPersian) {
      const toPersian = (n) => n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
      return {
        minutes,
        seconds,
        totalSeconds,
        isExpired: false,
        display: `${toPersian(minutes)}:${toPersian(seconds).padStart(2, '۰')}`,
        displayFull: `${toPersian(minutes)} دقیقه و ${toPersian(seconds)} ثانیه`,
      };
    }

    return {
      minutes,
      seconds,
      totalSeconds,
      isExpired: false,
      display: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      displayFull: `${minutes} min ${seconds} sec`,
    };
  }

  /**
   * فرمت کردن تاریخ به صورت نسبی (فارسی)
   * @param {Date|string} date - تاریخ
   * @returns {string} - مثال: "۳ دقیقه پیش"
   */
  function timeAgo(date) {
    const now = new Date();
    const target = date instanceof Date ? date : new Date(date);
    const diff = Math.floor((now - target) / 1000);

    if (diff < 60) return 'لحظاتی پیش';
    if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
    return `${Math.floor(diff / 86400)} روز پیش`;
  }

  // ──────────────────────────────────────────────
  // ۴. ID Generation & Random Values
  // ──────────────────────────────────────────────

  /**
   * تولید شناسه یکتا برای هر دانلود
   * @returns {string} - شناسه یکتا
   */
  function generateId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomPart}`;
  }

  /**
   * تولید یک رشته تصادفی (برای نام پوشه‌های موقت)
   * @param {number} length - طول رشته
   * @returns {string}
   */
  function randomString(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // ──────────────────────────────────────────────
  // ۵. DOM & Browser Utilities
  // ──────────────────────────────────────────────

  /**
   * کپی متن در کلیپ‌بورد
   * @param {string} text - متن برای کپی
   * @returns {Promise<boolean>} - موفقیت‌آمیز بودن
   */
  async function copyToClipboard(text) {
    try {
      // Modern Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      return successful;
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      return false;
    }
  }

  /**
   * تشخیص دستگاه کاربر
   * @returns {object} - اطلاعات دستگاه
   */
  function detectDevice() {
    const ua = navigator.userAgent;
    return {
      isMobile: /Android|iPhone|iPad|iPod|webOS/i.test(ua),
      isIOS: /iPhone|iPad|iPod/i.test(ua),
      isAndroid: /Android/i.test(ua),
      isDesktop: !/Android|iPhone|iPad|iPod|webOS/i.test(ua),
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    };
  }

  /**
   * بررسی آنلاین بودن کاربر
   * @returns {boolean}
   */
  function isOnline() {
    return typeof navigator !== 'undefined' && navigator.onLine !== undefined
      ? navigator.onLine
      : true;
  }

  /**
   * دریافت مقدار از LocalStorage با fallback
   * @param {string} key - کلید
   * @param {*} defaultValue - مقدار پیش‌فرض
   * @returns {*}
   */
  function getStorageItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * ذخیره مقدار در LocalStorage
   * @param {string} key - کلید
   * @param {*} value - مقدار
   */
  function setStorageItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('LocalStorage write failed:', error);
    }
  }

  /**
   * حذف مقدار از LocalStorage
   * @param {string} key - کلید
   */
  function removeStorageItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('LocalStorage remove failed:', error);
    }
  }

  // ──────────────────────────────────────────────
  // ۶. Performance & Debounce/Throttle
  // ──────────────────────────────────────────────

  /**
   * Debounce: اجرای تابع بعد از توقف فراخوانی‌ها
   * @param {Function} fn - تابع
   * @param {number} delay - تأخیر به میلی‌ثانیه
   * @returns {Function}
   */
  function debounce(fn, delay = 300) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Throttle: اجرای حداکثر یک بار در بازه زمانی
   * @param {Function} fn - تابع
   * @param {number} limit - محدودیت به میلی‌ثانیه
   * @returns {Function}
   */
  function throttle(fn, limit = 300) {
    let inThrottle = false;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // ──────────────────────────────────────────────
  // ۷. Error Handling Helpers
  // ──────────────────────────────────────────────

  /**
   * لاگ کردن خطا با جزئیات
   * @param {string} context - محل وقوع خطا
   * @param {Error} error - شیء خطا
   */
  function logError(context, error) {
    const timestamp = new Date().toISOString();
    const message = error?.message || error || 'Unknown error';
    console.error(`[${timestamp}] [${context}]`, message, error?.stack || '');

    // در صورت نیاز می‌توان به سرویس مانیتورینگ ارسال کرد
  }

  /**
   * ایجاد پیام خطای کاربرپسند
   * @param {Error|string} error - خطا
   * @returns {string} - پیام فارسی
   */
  function getUserFriendlyError(error) {
    const message = typeof error === 'string' ? error : error?.message || '';

    const errorMap = {
      'NetworkError': 'خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
      'Failed to fetch': 'ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.',
      'timeout': 'زمان درخواست به پایان رسید. لطفاً دوباره تلاش کنید.',
      'rate limit': 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه صبر کنید.',
      'quota': 'محدودیت استفاده از سرویس موقتاً فعال شده است.',
      'invalid url': 'لینک یوتیوب وارد شده معتبر نیست.',
      'download failed': 'دانلود با خطا مواجه شد. لطفاً دوباره تلاش کنید.',
      'not found': 'ویدیوی مورد نظر یافت نشد.',
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.';
  }

  // ──────────────────────────────────────────────
  // ۸. URL & API Helpers
  // ──────────────────────────────────────────────

  /**
   * ساخت query string از آبجکت
   * @param {object} params - پارامترها
   * @returns {string} - query string
   */
  function buildQueryString(params) {
    return Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * پارس query string به آبجکت
   * @param {string} queryString
   * @returns {object}
   */
  function parseQueryString(queryString) {
    const params = new URLSearchParams(queryString);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }

  /**
   * اعتبارسنجی و sanitize کردن URL
   * @param {string} url
   * @returns {string} - URL امن
   */
  function sanitizeUrl(url) {
    try {
      const parsed = new URL(url);
      // فقط http و https مجاز است
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '';
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }

  // ──────────────────────────────────────────────
  // ۹. DOM Manipulation Shortcuts
  // ──────────────────────────────────────────────

  /**
   * گرفتن المنت با ID
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  function $(id) {
    return document.getElementById(id);
  }

  /**
   * گرفتن همه المنت‌های مطابق با selector
   * @param {string} selector
   * @param {HTMLElement} parent
   * @returns {NodeList}
   */
  function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
  }

  /**
   * گرفتن اولین المنت مطابق با selector
   * @param {string} selector
   * @param {HTMLElement} parent
   * @returns {HTMLElement|null}
   */
  function $1(selector, parent = document) {
    return parent.querySelector(selector);
  }

  /**
   * ساخت المنت با attributes
   * @param {string} tag - نوع تگ
   * @param {object} attributes - ویژگی‌ها
   * @param {string|HTMLElement|HTMLElement[]} children - محتوا
   * @returns {HTMLElement}
   */
  function createElement(tag, attributes = {}, children = null) {
    const element = document.createElement(tag);

    // Set attributes
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        for (const [dataKey, dataValue] of Object.entries(value)) {
          element.dataset[dataKey] = dataValue;
        }
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.substring(2).toLowerCase(), value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    }

    // Append children
    if (children) {
      if (typeof children === 'string') {
        element.innerHTML = children;
      } else if (Array.isArray(children)) {
        children.forEach(child => {
          if (child instanceof HTMLElement || child instanceof Node) {
            element.appendChild(child);
          } else if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
          }
        });
      } else if (children instanceof HTMLElement || children instanceof Node) {
        element.appendChild(children);
      }
    }

    return element;
  }

  // ──────────────────────────────────────────────
  // ۱۰. Download Expiry (5-Minute Policy)
  // ──────────────────────────────────────────────

  /**
   * محاسبه زمان انقضا (الان + ۵ دقیقه)
   * @returns {Date}
   */
  function getExpiryTime() {
    const now = new Date();
    return new Date(now.getTime() + 5 * 60 * 1000); // +5 minutes
  }

  /**
   * بررسی منقضی شدن یک دانلود
   * @param {Date|string} expiryTime - زمان انقضا
   * @returns {boolean}
   */
  function isExpired(expiryTime) {
    const expiry = expiryTime instanceof Date ? expiryTime : new Date(expiryTime);
    return new Date() >= expiry;
  }

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────
  return {
    // Validation
    isValidYoutubeUrl,
    extractVideoId,
    normalizeYoutubeUrl,
    parseMultipleUrls,

    // Formatting
    sanitizeFileName,
    truncateText,
    formatFileSize,
    formatTime,

    // Date & Time
    getTimeRemaining,
    timeAgo,
    getExpiryTime,
    isExpired,

    // Generation
    generateId,
    randomString,

    // Browser
    copyToClipboard,
    detectDevice,
    isOnline,
    getStorageItem,
    setStorageItem,
    removeStorageItem,

    // Performance
    debounce,
    throttle,

    // Error
    logError,
    getUserFriendlyError,

    // URL
    buildQueryString,
    parseQueryString,
    sanitizeUrl,

    // DOM
    $,
    $$,
    $1,
    createElement,
  };

})();

// ──────────────────────────────────────────────
// Freeze the Utils object (immutable)
// ──────────────────────────────────────────────
Object.freeze(Utils);

// ──────────────────────────────────────────────
// Export shorthand aliases for common functions
// (makes code in other files cleaner)
// ──────────────────────────────────────────────
const $ = Utils.$;
const $$ = Utils.$$;
const $1 = Utils.$1;
const createEl = Utils.createElement;
const formatSize = Utils.formatFileSize;
const logError = Utils.logError;
const copyText = Utils.copyToClipboard;
const isValidUrl = Utils.isValidYoutubeUrl;
const getExpiry = Utils.getExpiryTime;
