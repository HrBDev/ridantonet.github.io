/* ============================================================
   i18n.js — Internationalization System
   For: khashayar.one YouTube Downloader
   Primary Language: Persian (fa) | Fallback: English (en)
   Dependencies: Utils (load AFTER utils.js)
   Must be loaded BEFORE: api.js, ui.js, app.js
   ============================================================ */

const I18n = (() => {
  'use strict';

  // ──────────────────────────────────────────────
  // ۱. Language Detection
  // ──────────────────────────────────────────────

  /**
   * تشخیص زبان فعلی
   * اولویت: localStorage > URL param > Browser > Default (fa)
   * @returns {string} - کد زبان ('fa' یا 'en')
   */
  function detectLanguage() {
    // ۱. بررسی localStorage
    const stored = Utils.getStorageItem('app_language');
    if (stored && ['fa', 'en'].includes(stored)) {
      return stored;
    }

    // ۲. بررسی URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && ['fa', 'en'].includes(urlLang)) {
      Utils.setStorageItem('app_language', urlLang);
      return urlLang;
    }

    // ۳. بررسی زبان مرورگر
    const browserLang = navigator.language || navigator.userLanguage || '';
    if (browserLang.startsWith('fa')) {
      Utils.setStorageItem('app_language', 'fa');
      return 'fa';
    }

    // ۴. پیش‌فرض: فارسی (چون کاربران اصلی ایرانی هستند)
    Utils.setStorageItem('app_language', 'fa');
    return 'fa';
  }

  // ──────────────────────────────────────────────
  // ۲. Translation Dictionary
  // ──────────────────────────────────────────────

  const translations = {
    fa: {
      // ── General ──
      app_name: 'Khashayar Downloader',
      app_tagline: 'دانلود ویدیوهای یوتیوب با بهترین کیفیت',
      app_description: 'لینک یوتیوب را وارد کنید، کیفیت مورد نظر را انتخاب کنید و ویدیو را مستقیماً دانلود کنید. همه چیز خودکار انجام می‌شود.',
      loading: 'در حال بارگذاری...',
      error_general: 'خطایی رخ داده است. لطفاً دوباره تلاش کنید.',
      retry: 'تلاش مجدد',
      close: 'بستن',
      cancel: 'انصراف',
      confirm: 'تأیید',
      ok: 'باشه',
      yes: 'بله',
      no: 'خیر',

      // ── Hero Section ──
      hero_title: 'دانلودر حرفه‌ای یوتیوب',
      hero_subtitle: 'فقط لینک ویدیو رو وارد کن، ما بقیه‌اش رو انجام میدیم',
      hero_powered_by: 'قدرت گرفته از GitHub Actions',

      // ── Form ──
      form_url_label: 'لینک ویدیو یوتیوب',
      form_url_placeholder: 'https://www.youtube.com/watch?v=... یا youtu.be/...',
      form_url_multiple_hint: 'می‌توانید چند لینک را با فاصله وارد کنید',
      form_quality_label: 'کیفیت',
      form_quality_best: 'بهترین کیفیت',
      form_quality_4k: '4K (2160p)',
      form_quality_2k: '2K (1440p)',
      form_quality_1080p: 'Full HD (1080p)',
      form_quality_720p: 'HD (720p)',
      form_quality_480p: 'SD (480p)',
      form_quality_audio: 'فقط صدا (MP3)',
      form_subtitle_label: 'زیرنویس فارسی و انگلیسی',
      form_subtitle_on: 'دانلود زیرنویس',
      form_subtitle_off: 'بدون زیرنویس',
      form_password_label: 'رمز فایل (اختیاری)',
      form_password_placeholder: 'رمز دلخواه برای فایل زیپ',
      form_submit: 'شروع دانلود',
      form_submit_loading: 'در حال دانلود...',
      form_url_required: 'لطفاً لینک یوتیوب را وارد کنید.',
      form_url_invalid: 'لینک یوتیوب معتبر نیست. لطفاً بررسی کنید.',
      form_url_not_youtube: 'فقط لینک‌های یوتیوب پشتیبانی می‌شوند.',
      form_quality_help: 'کیفیت بالاتر = حجم بیشتر',
      form_supported_sites: 'یوتیوب، یوتیوب موزیک، یوتیوب شورتز',

      // ── Progress ──
      progress_title: 'وضعیت دانلود',
      progress_step_1: 'ارسال درخواست',
      progress_step_2: 'در حال دانلود',
      progress_step_3: 'بسته‌بندی فایل',
      progress_step_4: 'آماده دریافت',
      progress_eta: 'زمان تقریبی باقی‌مانده',
      progress_cancel: 'لغو دانلود',

      // ── Result ──
      result_title: '✅ ویدیو آماده دریافت است',
      result_download_btn: 'دانلود فایل',
      result_copy_btn: 'کپی لینک دانلود',
      result_new_btn: 'دانلود جدید',
      result_size: 'حجم',
      result_quality: 'کیفیت',
      result_parts: 'تعداد پارت',
      result_subtitle: 'زیرنویس',
      result_expires_in: 'زمان باقی‌مانده',
      result_expired: 'منقضی شده',
      result_link_copied: 'لینک دانلود کپی شد!',
      result_download_started: 'دانلود شروع شد...',
      result_file_deleted_note: 'این فایل پس از ۵ دقیقه به طور خودکار حذف می‌شود.',
      result_parts_note: 'همه پارت‌ها را دانلود کنید، سپس فایل اصلی را باز کنید.',

      // ── Errors ──
      error_network: 'خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
      error_timeout: 'زمان درخواست به پایان رسید. لطفاً دوباره تلاش کنید.',
      error_rate_limit: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه صبر کنید.',
      error_download_failed: 'دانلود با خطا مواجه شد. لطفاً دوباره تلاش کنید.',
      error_video_not_found: 'ویدیوی مورد نظر یافت نشد. ممکن است حذف یا خصوصی شده باشد.',
      error_video_age_restricted: 'این ویدیو دارای محدودیت سنی است و قابل دانلود نیست.',
      error_video_geo_blocked: 'این ویدیو در منطقه شما مسدود است.',
      error_video_private: 'این ویدیو خصوصی است و قابل دانلود نیست.',
      error_video_live: 'ویدیوهای زنده قابل دانلود نیستند.',
      error_no_connection: 'ارتباط با سرور برقرار نشد. لطفاً وضعیت اینترنت را بررسی کنید.',
      error_invalid_url: 'لطفاً یک لینک معتبر یوتیوب وارد کنید.',
      error_server_error: 'خطای سرور. لطفاً بعداً دوباره امتحان کنید.',
      error_unknown: 'خطای ناشناخته‌ای رخ داده است.',

      // ── Notifications ──
      notify_success: 'عملیات با موفقیت انجام شد',
      notify_error: 'خطا در انجام عملیات',
      notify_warning: 'هشدار',
      notify_info: 'اطلاعات',
      notify_copied: 'در کلیپ‌بورد ذخیره شد!',
      notify_expired: 'زمان دانلود به پایان رسید. لطفاً دوباره درخواست دهید.',
      notify_cleaning: 'در حال پاکسازی فایل‌های منقضی شده...',

      // ── Footer ──
      footer_brand: 'ساخته شده توسط Khashayar',
      footer_github: 'گیت‌هاب',
      footer_website: 'وب‌سایت',
      footer_license: 'MIT License',
      footer_rights: 'تمامی حقوق محفوظ است.',
      footer_disclaimer: 'این سرویس صرفاً برای دانلود ویدیوهای مجاز طراحی شده است.',

      // ── Timer ──
      timer_minutes: 'دقیقه',
      timer_seconds: 'ثانیه',
      timer_expired_text: 'منقضی شد',
      timer_urgent_text: 'عجله کنید!',

      // ── Cleaner ──
      cleaner_auto_delete: 'حذف خودکار',
      cleaner_after_5min: 'این فایل ۵ دقیقه پس از دانلود حذف می‌شود',
      cleaner_deleted: 'فایل به طور خودکار حذف شد',
    },

    en: {
      // ── General ──
      app_name: 'Khashayar Downloader',
      app_tagline: 'Download YouTube videos in the best quality',
      app_description: 'Enter the YouTube link, select your desired quality, and download the video directly. Everything is automated.',
      loading: 'Loading...',
      error_general: 'An error occurred. Please try again.',
      retry: 'Retry',
      close: 'Close',
      cancel: 'Cancel',
      confirm: 'Confirm',
      ok: 'OK',
      yes: 'Yes',
      no: 'No',

      // ── Hero Section ──
      hero_title: 'Professional YouTube Downloader',
      hero_subtitle: 'Just enter a video link, we\'ll handle the rest',
      hero_powered_by: 'Powered by GitHub Actions',

      // ── Form ──
      form_url_label: 'YouTube Video Link',
      form_url_placeholder: 'https://www.youtube.com/watch?v=... or youtu.be/...',
      form_url_multiple_hint: 'You can enter multiple links separated by spaces',
      form_quality_label: 'Quality',
      form_quality_best: 'Best Quality',
      form_quality_4k: '4K (2160p)',
      form_quality_2k: '2K (1440p)',
      form_quality_1080p: 'Full HD (1080p)',
      form_quality_720p: 'HD (720p)',
      form_quality_480p: 'SD (480p)',
      form_quality_audio: 'Audio Only (MP3)',
      form_subtitle_label: 'Persian & English Subtitles',
      form_subtitle_on: 'Download Subtitles',
      form_subtitle_off: 'No Subtitles',
      form_password_label: 'File Password (optional)',
      form_password_placeholder: 'Custom password for zip file',
      form_submit: 'Start Download',
      form_submit_loading: 'Downloading...',
      form_url_required: 'Please enter a YouTube link.',
      form_url_invalid: 'Invalid YouTube link. Please check.',
      form_url_not_youtube: 'Only YouTube links are supported.',
      form_quality_help: 'Higher quality = Larger file size',
      form_supported_sites: 'YouTube, YouTube Music, YouTube Shorts',

      // ── Progress ──
      progress_title: 'Download Status',
      progress_step_1: 'Sending Request',
      progress_step_2: 'Downloading',
      progress_step_3: 'Packaging',
      progress_step_4: 'Ready',
      progress_eta: 'Estimated time remaining',
      progress_cancel: 'Cancel Download',

      // ── Result ──
      result_title: '✅ Video is ready!',
      result_download_btn: 'Download File',
      result_copy_btn: 'Copy Download Link',
      result_new_btn: 'New Download',
      result_size: 'Size',
      result_quality: 'Quality',
      result_parts: 'Parts',
      result_subtitle: 'Subtitles',
      result_expires_in: 'Expires in',
      result_expired: 'Expired',
      result_link_copied: 'Download link copied!',
      result_download_started: 'Download started...',
      result_file_deleted_note: 'This file will be automatically deleted after 5 minutes.',
      result_parts_note: 'Download all parts, then open the main file.',

      // ── Errors ──
      error_network: 'Network error. Please check your internet connection.',
      error_timeout: 'Request timed out. Please try again.',
      error_rate_limit: 'Too many requests. Please wait a few minutes.',
      error_download_failed: 'Download failed. Please try again.',
      error_video_not_found: 'Video not found. It may have been removed or is private.',
      error_video_age_restricted: 'This video is age-restricted and cannot be downloaded.',
      error_video_geo_blocked: 'This video is blocked in your region.',
      error_video_private: 'This video is private and cannot be downloaded.',
      error_video_live: 'Live videos cannot be downloaded.',
      error_no_connection: 'Could not connect to server. Check your internet.',
      error_invalid_url: 'Please enter a valid YouTube link.',
      error_server_error: 'Server error. Please try again later.',
      error_unknown: 'An unknown error occurred.',

      // ── Notifications ──
      notify_success: 'Operation completed successfully',
      notify_error: 'Operation failed',
      notify_warning: 'Warning',
      notify_info: 'Information',
      notify_copied: 'Saved to clipboard!',
      notify_expired: 'Download time expired. Please request again.',
      notify_cleaning: 'Cleaning expired files...',

      // ── Footer ──
      footer_brand: 'Created by Khashayar',
      footer_github: 'GitHub',
      footer_website: 'Website',
      footer_license: 'MIT License',
      footer_rights: 'All rights reserved.',
      footer_disclaimer: 'This service is only for downloading authorized videos.',

      // ── Timer ──
      timer_minutes: 'min',
      timer_seconds: 'sec',
      timer_expired_text: 'Expired',
      timer_urgent_text: 'Hurry up!',

      // ── Cleaner ──
      cleaner_auto_delete: 'Auto Delete',
      cleaner_after_5min: 'This file will be deleted 5 minutes after download',
      cleaner_deleted: 'File automatically deleted',
    },
  };

  // ──────────────────────────────────────────────
  // ۳. Core Translation Functions
  // ──────────────────────────────────────────────

  let currentLang = detectLanguage();

  /**
   * دریافت ترجمه بر اساس کلید
   * @param {string} key - کلید ترجمه
   * @param {object} replacements - جایگزین‌های داینامیک
   * @returns {string} - متن ترجمه شده
   */
  function t(key, replacements = {}) {
    const langData = translations[currentLang] || translations.fa;
    let text = langData[key];

    // اگر ترجمه پیدا نشد
    if (!text) {
      // تلاش با زبان fallback (fa)
      if (currentLang !== 'fa') {
        text = translations.fa[key];
      }
      // اگر باز هم نبود، خود کلید را برمی‌گردانیم
      if (!text) {
        console.warn(`[i18n] Missing translation for key: "${key}" in language: "${currentLang}"`);
        return `[${key}]`;
      }
    }

    // جایگزینی متغیرها
    for (const [placeholder, value] of Object.entries(replacements)) {
      text = text.replace(new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'), value);
    }

    return text;
  }

  /**
   * تغییر زبان برنامه
   * @param {string} lang - کد زبان ('fa' یا 'en')
   */
  function setLanguage(lang) {
    if (!['fa', 'en'].includes(lang)) {
      console.warn(`[i18n] Invalid language: "${lang}". Falling back to "fa".`);
      lang = 'fa';
    }

    currentLang = lang;
    Utils.setStorageItem('app_language', lang);

    // تنظیم direction در HTML
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';

    // انتشار رویداد تغییر زبان (تا بقیه کامپوننت‌ها واکنش نشان دهند)
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }

  /**
   * دریافت زبان فعلی
   * @returns {string}
   */
  function getLanguage() {
    return currentLang;
  }

  /**
   * آیا زبان فعلی فارسی است؟
   * @returns {boolean}
   */
  function isPersian() {
    return currentLang === 'fa';
  }

  /**
   * آیا زبان فعلی انگلیسی است؟
   * @returns {boolean}
   */
  function isEnglish() {
    return currentLang === 'en';
  }

  // ──────────────────────────────────────────────
  // ۴. Initialization
  // ──────────────────────────────────────────────

  function init() {
    // تنظیم direction اولیه
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'fa' ? 'rtl' : 'ltr';

    console.log(`[i18n] Initialized with language: ${currentLang} (${isPersian() ? 'فارسی' : 'English'})`);
  }

  // اجرای اولیه
  init();

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────
  return {
    t,
    setLanguage,
    getLanguage,
    isPersian,
    isEnglish,
    getTranslations: () => translations,
  };

})();

// ──────────────────────────────────────────────
// Freeze the I18n object (immutable)
// ──────────────────────────────────────────────
Object.freeze(I18n);

// ──────────────────────────────────────────────
// Export shorthand
// ──────────────────────────────────────────────
const __ = I18n.t; // Short alias for translation function
