/* ============================================================
   ui.js — User Interface Management
   For: khashayar.one YouTube Downloader
   Dependencies: Utils (utils.js), I18n (i18n.js), API (api.js)
   Must be loaded BEFORE: app.js
   ============================================================ */

const UI = (() => {
  'use strict';

  // ──────────────────────────────────────────────
  // ۱. State
  // ──────────────────────────────────────────────

  const state = {
    isProcessing: false,
    currentDownload: null,
    timerInterval: null,
    progressStages: ['request', 'download', 'package', 'ready'],
    currentStage: 0,
    device: Utils.detectDevice(),
  };

  // ──────────────────────────────────────────────
  // ۲. Cache DOM References
  // ──────────────────────────────────────────────

  const dom = {
    app: null,
    appContent: null,
    skeleton: null,
    hero: null,
    formCard: null,
    progressContainer: null,
    resultCard: null,
    errorState: null,
    footer: null,
  };

  // ──────────────────────────────────────────────
  // ۳. Main Build Functions
  // ──────────────────────────────────────────────

  /**
   * ساخت کل رابط کاربری
   */
  function buildApp() {
    dom.app = Utils.$('app');
    dom.appContent = Utils.$('app-content');
    dom.skeleton = Utils.$('skeleton-loader');

    if (!dom.appContent) return;

    // خالی کردن container
    dom.appContent.innerHTML = '';

    // ساخت بخش‌های اصلی
    dom.appContent.appendChild(buildHero());
    dom.appContent.appendChild(buildFormCard());
    dom.appContent.appendChild(buildProgressContainer());
    dom.appContent.appendChild(buildResultCard());
    dom.appContent.appendChild(buildErrorState());
    dom.appContent.appendChild(buildFooter());

    // مخفی کردن skeleton و نمایش محتوا
    if (dom.skeleton) {
      dom.skeleton.style.display = 'none';
    }
    dom.appContent.classList.remove('hidden');

    // کش کردن رفرنس‌های جدید
    cacheDOMElements();

    // راه‌اندازی event listeners
    attachEventListeners();

    // انیمیشن ورود
    animateEntrance();

    console.log('[UI] App built successfully');
  }

  /**
   * کش کردن رفرنس‌های DOM بعد از ساخت
   */
  function cacheDOMElements() {
    dom.hero = Utils.$1('.hero-wrapper');
    dom.formCard = Utils.$1('.download-card');
    dom.progressContainer = Utils.$1('.progress-container');
    dom.resultCard = Utils.$1('.result-card');
    dom.errorState = Utils.$1('.error-state');
    dom.footer = Utils.$1('.app-footer');
  }

  // ──────────────────────────────────────────────
  // ۴. Hero Section Builder
  // ──────────────────────────────────────────────

  function buildHero() {
    const wrapper = Utils.createElement('div', { className: 'hero-wrapper' });

    // لوگو
    const logoContainer = Utils.createElement('div', { className: 'hero-logo-container' });
    const logoImg = Utils.createElement('img', {
      src: 'assets/img/logo.svg',
      alt: 'Khashayar Downloader',
      width: '48',
      height: '48',
      onerror: function () {
        this.style.display = 'none';
        this.parentElement.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand-400"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29.94 29.94 0 0 0 1 11.75a29.94 29.94 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29.94 29.94 0 0 0 .46-5.25 29.94 29.94 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>';
      }
    });
    logoContainer.appendChild(logoImg);
    wrapper.appendChild(logoContainer);

    // تایتل
    const title = Utils.createElement('h1', { className: 'hero-title' }, __('hero_title'));
    wrapper.appendChild(title);

    // زیرتایتل
    const subtitle = Utils.createElement('p', { className: 'hero-subtitle' }, __('hero_subtitle'));
    wrapper.appendChild(subtitle);

    return wrapper;
  }

  // ──────────────────────────────────────────────
  // ۵. Form Card Builder
  // ──────────────────────────────────────────────

  function buildFormCard() {
    const card = Utils.createElement('div', { className: 'download-card' });

    // ── URL Input ──
    const urlWrapper = Utils.createElement('div', { className: 'url-input-wrapper' });
    const urlInput = Utils.createElement('input', {
      type: 'text',
      id: 'url-input',
      className: 'url-input',
      placeholder: __('form_url_placeholder'),
      autocomplete: 'off',
      spellcheck: 'false',
      dir: 'ltr',
    });
    const urlIcon = Utils.createElement('span', {
      className: 'url-input-icon',
      innerHTML: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
    });
    urlWrapper.appendChild(urlInput);
    urlWrapper.appendChild(urlIcon);
    card.appendChild(urlWrapper);

    // Multiple URL hint
    const urlHint = Utils.createElement('p', {
      className: 'text-xs text-text-muted mt-2 px-1',
    }, __('form_url_multiple_hint'));
    card.appendChild(urlHint);

    // ── Options Row ──
    const optionsRow = Utils.createElement('div', { className: 'options-row' });

    // Quality Select
    const qualitySelect = buildQualitySelect();
    optionsRow.appendChild(qualitySelect);

    // Subtitle Toggle
    const subtitleToggle = buildSubtitleToggle();
    optionsRow.appendChild(subtitleToggle);

    card.appendChild(optionsRow);

    // ── Password Row ──
    const passwordRow = Utils.createElement('div', { className: 'password-row' });
    const passwordIcon = Utils.createElement('span', {
      className: 'password-icon',
      innerHTML: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    });
    const passwordInput = Utils.createElement('input', {
      type: 'text',
      id: 'password-input',
      className: 'password-input',
      placeholder: __('form_password_placeholder'),
      autocomplete: 'off',
      dir: 'ltr',
    });
    passwordRow.appendChild(passwordIcon);
    passwordRow.appendChild(passwordInput);
    card.appendChild(passwordRow);

    // ── Submit Button ──
    const submitBtn = Utils.createElement('button', {
      id: 'submit-btn',
      className: 'submit-btn',
    }, [
      Utils.createElement('span', {}, [
        Utils.createElement('span', { className: 'btn-text' }, __('form_submit')),
        Utils.createElement('span', { className: 'spinner' }),
      ]),
    ]);
    card.appendChild(submitBtn);

    // ── Supported sites hint ──
    const supportedHint = Utils.createElement('p', {
      className: 'text-xs text-text-muted text-center mt-3',
    }, __('form_supported_sites'));
    card.appendChild(supportedHint);

    return card;
  }

  /**
   * ساخت select کیفیت
   */
  function buildQualitySelect() {
    const select = Utils.createElement('select', {
      id: 'quality-select',
      className: 'option-select',
    });

    const options = [
      { value: 'best', label: __('form_quality_best') },
      { value: '2160', label: __('form_quality_4k') },
      { value: '1440', label: __('form_quality_2k') },
      { value: '1080', label: __('form_quality_1080p') },
      { value: '720', label: __('form_quality_720p') },
      { value: '480', label: __('form_quality_480p') },
      { value: 'audio', label: __('form_quality_audio') },
    ];

    options.forEach(opt => {
      const optionEl = Utils.createElement('option', { value: opt.value }, opt.label);
      select.appendChild(optionEl);
    });

    return select;
  }

  /**
   * ساخت toggle زیرنویس
   */
  function buildSubtitleToggle() {
    const wrapper = Utils.createElement('div', {
      id: 'subtitle-toggle',
      className: 'toggle-wrapper',
      role: 'switch',
      'aria-checked': 'false',
      tabindex: '0',
    });

    const label = Utils.createElement('span', { className: 'toggle-label' }, __('form_subtitle_off'));
    const switchEl = Utils.createElement('div', { className: 'toggle-switch' });

    wrapper.appendChild(label);
    wrapper.appendChild(switchEl);

    return wrapper;
  }

  // ──────────────────────────────────────────────
  // ۶. Progress Indicator Builder
  // ──────────────────────────────────────────────

  function buildProgressContainer() {
    const container = Utils.createElement('div', { className: 'progress-container' });

    const stepsWrapper = Utils.createElement('div', { className: 'progress-steps' });

    // خط اتصال
    const lineFill = Utils.createElement('div', {
      className: 'progress-line-fill',
      style: { width: '0%' },
    });
    stepsWrapper.appendChild(lineFill);

    // مراحل
    const stages = [
      { id: 'request', icon: '📤', label: __('progress_step_1') },
      { id: 'download', icon: '⬇️', label: __('progress_step_2') },
      { id: 'package', icon: '📦', label: __('progress_step_3') },
      { id: 'ready', icon: '✅', label: __('progress_step_4') },
    ];

    stages.forEach((stage, index) => {
      const stepEl = Utils.createElement('div', {
        className: 'progress-step',
        dataset: { stage: stage.id },
      });

      const iconEl = Utils.createElement('div', { className: 'step-icon' }, stage.icon);
      const labelEl = Utils.createElement('span', { className: 'step-label' }, stage.label);

      stepEl.appendChild(iconEl);
      stepEl.appendChild(labelEl);
      stepsWrapper.appendChild(stepEl);
    });

    container.appendChild(stepsWrapper);

    // دکمه لغو
    const cancelBtn = Utils.createElement('button', {
      className: 'error-retry-btn mt-6 mx-auto block',
      id: 'cancel-download-btn',
      style: { display: 'none' },
    }, __('progress_cancel'));
    container.appendChild(cancelBtn);

    return container;
  }

  // ──────────────────────────────────────────────
  // ۷. Result Card Builder
  // ──────────────────────────────────────────────

  function buildResultCard() {
    const card = Utils.createElement('div', { className: 'result-card', id: 'result-card' });

    // این بخش داینامیک پر می‌شود
    card.innerHTML = `
      <div class="result-header" id="result-header">
        <img class="result-thumbnail" id="result-thumbnail" src="" alt="Thumbnail" style="display:none;" />
        <div class="result-info">
          <div class="result-title" id="result-title"></div>
          <div class="result-meta" id="result-meta"></div>
        </div>
      </div>
      <div class="result-actions" id="result-actions">
        <button class="btn-download" id="btn-download">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>${__('result_download_btn')}</span>
        </button>
        <button class="btn-copy" id="btn-copy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>${__('result_copy_btn')}</span>
        </button>
        <button class="btn-new" id="btn-new-download">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>${__('result_new_btn')}</span>
        </button>
      </div>
      <p class="text-xs text-center mt-4 text-text-muted expiry-note" id="expiry-note">
        ${__('result_file_deleted_note')}
      </p>
    `;

    return card;
  }

  // ──────────────────────────────────────────────
  // ۸. Error State Builder
  // ──────────────────────────────────────────────

  function buildErrorState() {
    const container = Utils.createElement('div', { className: 'error-state', id: 'error-state' });

    container.innerHTML = `
      <div class="error-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <p class="error-message" id="error-message"></p>
      <button class="error-retry-btn" id="error-retry-btn">${__('retry')}</button>
    `;

    return container;
  }

  // ──────────────────────────────────────────────
  // ۹. Footer Builder
  // ──────────────────────────────────────────────

  function buildFooter() {
    const footer = Utils.createElement('footer', { className: 'app-footer' });

    footer.innerHTML = `
      <div class="footer-brand">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        <span>${__('footer_brand')}</span>
      </div>
      <div class="footer-links">
        <a href="https://github.com/khashayardev" target="_blank" rel="noopener">${__('footer_github')}</a>
        <span class="text-text-muted">•</span>
        <a href="https://khashayar.one" target="_blank" rel="noopener">${__('footer_website')}</a>
        <span class="text-text-muted">•</span>
        <span>${__('footer_license')}</span>
      </div>
      <p class="footer-copyright">${__('footer_disclaimer')}</p>
    `;

    return footer;
  }

  // ──────────────────────────────────────────────
  // ۱۰. Event Listeners
  // ──────────────────────────────────────────────

  function attachEventListeners() {
    // Submit button
    const submitBtn = Utils.$('submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit);
    }

    // URL input - Enter key
    const urlInput = Utils.$('url-input');
    if (urlInput) {
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        }
      });

      // Real-time URL validation
      urlInput.addEventListener('input', Utils.debounce(() => {
        validateUrlInput(urlInput.value);
      }, 500));
    }

    // Subtitle toggle
    const subtitleToggle = Utils.$('subtitle-toggle');
    if (subtitleToggle) {
      subtitleToggle.addEventListener('click', toggleSubtitle);
      subtitleToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleSubtitle();
        }
      });
    }

    // Result buttons
    const btnDownload = Utils.$('btn-download');
    const btnCopy = Utils.$('btn-copy');
    const btnNew = Utils.$('btn-new-download');

    if (btnDownload) btnDownload.addEventListener('click', handleDownloadClick);
    if (btnCopy) btnCopy.addEventListener('click', handleCopyClick);
    if (btnNew) btnNew.addEventListener('click', resetForm);

    // Error retry
    const errorRetryBtn = Utils.$('error-retry-btn');
    if (errorRetryBtn) errorRetryBtn.addEventListener('click', () => {
      hideError();
      resetForm();
    });

    // Cancel download
    const cancelBtn = Utils.$('cancel-download-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancelDownload);

    // Language change listener
    window.addEventListener('languageChanged', () => {
      rebuildApp();
    });
  }

  // ──────────────────────────────────────────────
  // ۱۱. Form Handling
  // ──────────────────────────────────────────────

  function handleSubmit() {
    if (state.isProcessing) return;

    const urlInput = Utils.$('url-input');
    const url = urlInput?.value?.trim();

    // Validation
    if (!url) {
      showUrlError(__('form_url_required'));
      return;
    }

    if (!Utils.isValidYoutubeUrl(url)) {
      showUrlError(__('form_url_invalid'));
      return;
    }

    // Clear error
    clearUrlError();

    // Get form values
    const qualitySelect = Utils.$('quality-select');
    const subtitleToggle = Utils.$('subtitle-toggle');
    const passwordInput = Utils.$('password-input');

    const quality = qualitySelect?.value || 'best';
    const subtitles = subtitleToggle?.classList.contains('active') || false;
    const password = passwordInput?.value?.trim() || '';

    // Dispatch event for app.js to handle
    window.dispatchEvent(new CustomEvent('downloadRequested', {
      detail: {
        url: Utils.normalizeYoutubeUrl(url),
        quality,
        subtitles,
        password,
      },
    }));
  }

  /**
   * اعتبارسنجی زنده URL
   */
  function validateUrlInput(value) {
    if (!value || value.trim() === '') {
      clearUrlError();
      return;
    }

    if (!Utils.isValidYoutubeUrl(value)) {
      // فقط استایل خطا، بدون پیام (برای اینکه اذیت نکنه)
      const urlInput = Utils.$('url-input');
      if (urlInput && !urlInput.classList.contains('error')) {
        // صبر می‌کنیم تا کاربر تایپش تموم بشه
      }
    } else {
      clearUrlError();
    }
  }

  /**
   * نمایش خطا روی input
   */
  function showUrlError(message) {
    const urlInput = Utils.$('url-input');
    if (urlInput) {
      urlInput.classList.add('error');

      // نمایش پیام خطا
      let errorMsg = Utils.$1('.url-error-message');
      if (!errorMsg) {
        errorMsg = Utils.createElement('p', {
          className: 'url-error-message text-xs text-red-400 mt-2 px-1 animate-fade-in',
        });
        urlInput.parentElement.appendChild(errorMsg);
      }
      errorMsg.textContent = message;
    }
  }

  /**
   * پاک کردن خطای URL
   */
  function clearUrlError() {
    const urlInput = Utils.$('url-input');
    if (urlInput) {
      urlInput.classList.remove('error');
    }

    const errorMsg = Utils.$1('.url-error-message');
    if (errorMsg) {
      errorMsg.remove();
    }
  }

  /**
   * Toggle زیرنویس
   */
  function toggleSubtitle() {
    const wrapper = Utils.$('subtitle-toggle');
    if (!wrapper) return;

    const isActive = wrapper.classList.toggle('active');
    wrapper.setAttribute('aria-checked', isActive.toString());

    const label = wrapper.querySelector('.toggle-label');
    if (label) {
      label.textContent = isActive ? __('form_subtitle_on') : __('form_subtitle_off');
    }
  }

  // ──────────────────────────────────────────────
  // ۱۲. Processing State Management
  // ──────────────────────────────────────────────

  /**
   * فعال کردن حالت processing
   */
  function setProcessing(active) {
    state.isProcessing = active;

    const submitBtn = Utils.$('submit-btn');
    const urlInput = Utils.$('url-input');
    const qualitySelect = Utils.$('quality-select');
    const passwordInput = Utils.$('password-input');

    if (submitBtn) {
      submitBtn.disabled = active;
      if (active) {
        submitBtn.classList.add('loading');
      } else {
        submitBtn.classList.remove('loading');
      }
    }

    if (urlInput) urlInput.disabled = active;
    if (qualitySelect) qualitySelect.disabled = active;
    if (passwordInput) passwordInput.disabled = active;
  }

  /**
   * به‌روزرسانی progress bar
   * @param {string} stage - مرحله فعلی ('request', 'download', 'package', 'ready')
   */
  function updateProgress(stage) {
    const stageIndex = state.progressStages.indexOf(stage);
    if (stageIndex === -1) return;

    state.currentStage = stageIndex;

    // نمایش progress container
    if (dom.progressContainer) {
      dom.progressContainer.classList.add('visible');
    }

    // مخفی کردن form card
    if (dom.formCard) {
      dom.formCard.style.opacity = '0.5';
      dom.formCard.style.pointerEvents = 'none';
    }

    // آپدیت مراحل
    const steps = Utils.$$('.progress-step');
    steps.forEach((step, index) => {
      step.classList.remove('completed', 'active');

      if (index < stageIndex) {
        step.classList.add('completed');
      } else if (index === stageIndex) {
        step.classList.add('active');
      }
    });

    // آپدیت خط پیشرفت
    const lineFill = Utils.$1('.progress-line-fill');
    if (lineFill) {
      const percentage = ((stageIndex + 1) / state.progressStages.length) * 100;
      lineFill.style.width = `${percentage}%`;
    }

    // دکمه لغو فقط در مراحل اولیه
    const cancelBtn = Utils.$('cancel-download-btn');
    if (cancelBtn) {
      cancelBtn.style.display = stageIndex < 3 ? 'block' : 'none';
    }
  }

  /**
   * نمایش نتیجه دانلود
   * @param {object} downloadInfo - اطلاعات دانلود
   */
  function showResult(downloadInfo) {
    // مخفی کردن progress
    if (dom.progressContainer) {
      dom.progressContainer.classList.remove('visible');
    }

    // پر کردن اطلاعات نتیجه
    const { title, thumbnail, size, quality, downloadUrl, folderName, expiryTime } = downloadInfo;

    const resultTitle = Utils.$('result-title');
    const resultMeta = Utils.$('result-meta');
    const resultThumbnail = Utils.$('result-thumbnail');

    if (resultTitle) resultTitle.textContent = title || __('result_title');
    if (resultThumbnail) {
      if (thumbnail) {
        resultThumbnail.src = thumbnail;
        resultThumbnail.style.display = 'block';
      } else {
        resultThumbnail.style.display = 'none';
      }
    }

    // متا دیتا
    if (resultMeta) {
      resultMeta.innerHTML = `
        <span>📦 ${formatSize(size || 0)}</span>
        <span>🎬 ${quality || 'best'}</span>
        ${expiryTime ? `<span class="expiry-badge" id="expiry-badge">⏱ ${__('result_expires_in')}: <span id="expiry-timer">--:--</span></span>` : ''}
      `;
    }

    // ذخیره اطلاعات برای استفاده در دکمه‌ها
    state.currentDownload = downloadInfo;

    // نمایش result card
    if (dom.resultCard) {
      dom.resultCard.classList.add('visible');
    }

    // مخفی کردن form
    if (dom.formCard) {
      dom.formCard.style.display = 'none';
    }

    // شروع تایمر انقضا
    if (expiryTime) {
      startExpiryTimer(expiryTime);
    }

    // اسکرول به نتیجه
    if (dom.resultCard) {
      dom.resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * نمایش خطا
   * @param {string} message - پیام خطا
   */
  function showError(message) {
    // مخفی کردن progress
    if (dom.progressContainer) {
      dom.progressContainer.classList.remove('visible');
    }

    // تنظیم پیام
    const errorMessage = Utils.$('error-message');
    if (errorMessage) {
      errorMessage.textContent = message || __('error_general');
    }

    // نمایش error state
    if (dom.errorState) {
      dom.errorState.classList.add('visible');
    }

    // فعال کردن مجدد form
    if (dom.formCard) {
      dom.formCard.style.opacity = '1';
      dom.formCard.style.pointerEvents = 'auto';
    }

    setProcessing(false);
  }

  /**
   * مخفی کردن خطا
   */
  function hideError() {
    if (dom.errorState) {
      dom.errorState.classList.remove('visible');
    }
  }

  // ──────────────────────────────────────────────
  // ۱۳. Result Actions
  // ──────────────────────────────────────────────

  function handleDownloadClick() {
    if (!state.currentDownload?.downloadUrl) return;

    // باز کردن لینک دانلود
    window.open(state.currentDownload.downloadUrl, '_blank');

    // اطلاع‌رسانی
    showNotification('success', __('result_download_started'));
  }

  async function handleCopyClick() {
    if (!state.currentDownload?.downloadUrl) return;

    const success = await Utils.copyToClipboard(state.currentDownload.downloadUrl);

    if (success) {
      showNotification('success', __('result_link_copied'));

      // تغییر موقت متن دکمه
      const copyBtn = Utils.$('btn-copy');
      if (copyBtn) {
        const originalText = copyBtn.querySelector('span')?.textContent;
        const spanEl = copyBtn.querySelector('span');
        if (spanEl) spanEl.textContent = '✅ ' + __('notify_copied');

        setTimeout(() => {
          if (spanEl) spanEl.textContent = originalText || __('result_copy_btn');
        }, 2000);
      }
    } else {
      showNotification('error', __('error_general'));
    }
  }

  // ──────────────────────────────────────────────
  // ۱۴. Cancel Download
  // ──────────────────────────────────────────────

  async function handleCancelDownload() {
    const confirmed = await showConfirm(
      'لغو دانلود',
      'آیا از لغو دانلود مطمئن هستید؟'
    );

    if (!confirmed) return;

    window.dispatchEvent(new CustomEvent('downloadCancelled'));
  }

  // ──────────────────────────────────────────────
  // ۱۵. Form Reset
  // ──────────────────────────────────────────────

  function resetForm() {
    // پاک کردن state
    state.currentDownload = null;
    state.isProcessing = false;
    state.currentStage = 0;

    // توقف تایمر
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    // پاکسازی form
    const urlInput = Utils.$('url-input');
    if (urlInput) {
      urlInput.value = '';
      urlInput.disabled = false;
    }

    const passwordInput = Utils.$('password-input');
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.disabled = false;
    }

    const qualitySelect = Utils.$('quality-select');
    if (qualitySelect) {
      qualitySelect.value = 'best';
      qualitySelect.disabled = false;
    }

    // ریست toggle
    const subtitleToggle = Utils.$('subtitle-toggle');
    if (subtitleToggle) {
      subtitleToggle.classList.remove('active');
      subtitleToggle.setAttribute('aria-checked', 'false');
      const label = subtitleToggle.querySelector('.toggle-label');
      if (label) label.textContent = __('form_subtitle_off');
    }

    // مخفی کردن result و error
    if (dom.resultCard) dom.resultCard.classList.remove('visible');
    if (dom.errorState) dom.errorState.classList.remove('visible');
    if (dom.progressContainer) dom.progressContainer.classList.remove('visible');

    // نمایش form
    if (dom.formCard) {
      dom.formCard.style.display = '';
      dom.formCard.style.opacity = '1';
      dom.formCard.style.pointerEvents = 'auto';
    }

    // ریست دکمه
    const submitBtn = Utils.$('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }

    // پاکسازی خطاها
    clearUrlError();

    // فوکوس به input
    if (urlInput) {
      setTimeout(() => urlInput.focus(), 300);
    }
  }

  // ──────────────────────────────────────────────
  // ۱۶. Expiry Timer (۵ دقیقه)
  // ──────────────────────────────────────────────

  function startExpiryTimer(expiryTime) {
    // توقف تایمر قبلی
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
    }

    const timerDisplay = Utils.$('expiry-timer');
    const expiryBadge = Utils.$('expiry-badge');

    const updateTimer = () => {
      const remaining = Utils.getTimeRemaining(expiryTime);

      if (timerDisplay) {
        timerDisplay.textContent = remaining.display;
      }

      // تغییر رنگ در ۱ دقیقه آخر
      if (remaining.totalSeconds <= 60 && expiryBadge) {
        expiryBadge.classList.add('urgent');
      }

      if (remaining.isExpired) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;

        if (timerDisplay) {
          timerDisplay.textContent = __('timer_expired_text');
        }

        // غیرفعال کردن دکمه‌ها
        const btnDownload = Utils.$('btn-download');
        const btnCopy = Utils.$('btn-copy');
        if (btnDownload) {
          btnDownload.disabled = true;
          btnDownload.style.opacity = '0.5';
          btnDownload.style.cursor = 'not-allowed';
        }
        if (btnCopy) {
          btnCopy.disabled = true;
          btnCopy.style.opacity = '0.5';
          btnCopy.style.cursor = 'not-allowed';
        }

        showNotification('warning', __('notify_expired'));
      }
    };

    // اجرای اولیه
    updateTimer();

    // به‌روزرسانی هر ثانیه
    state.timerInterval = setInterval(updateTimer, 1000);
  }

  // ──────────────────────────────────────────────
  // ۱۷. Notifications (SweetAlert2)
  // ──────────────────────────────────────────────

  function showNotification(type, message) {
    if (typeof Swal === 'undefined') {
      // Fallback: console
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }

    const icons = {
      success: 'success',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };

    Swal.fire({
      icon: icons[type] || 'info',
      text: message,
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'swal2-popup',
      },
    });
  }

  /**
   * نمایش دیالوگ تأیید
   * @param {string} title
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function showConfirm(title, text) {
    if (typeof Swal === 'undefined') {
      return confirm(`${title}\n${text}`);
    }

    const result = await Swal.fire({
      title: title,
      text: text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: __('confirm'),
      cancelButtonText: __('cancel'),
      customClass: {
        popup: 'swal2-popup',
      },
    });

    return result.isConfirmed;
  }

  // ──────────────────────────────────────────────
  // ۱۸. Animations
  // ──────────────────────────────────────────────

  function animateEntrance() {
    // GSAP انیمیشن ورود (اگر GSAP در دسترس باشد)
    if (typeof gsap !== 'undefined') {
      gsap.from('.hero-logo-container', {
        scale: 0,
        rotation: 90,
        duration: 0.8,
        ease: 'back.out(1.7)',
      });

      gsap.from('.hero-title', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        delay: 0.3,
        ease: 'power3.out',
      });

      gsap.from('.hero-subtitle', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

      gsap.from('.download-card', {
        y: 50,
        opacity: 0,
        duration: 0.8,
        delay: 0.7,
        ease: 'power4.out',
      });
    }
  }

  // ──────────────────────────────────────────────
  // ۱۹. Helper: Rebuild on Language Change
  // ──────────────────────────────────────────────

  function rebuildApp() {
    // فقط در حالت idle بازسازی کن
    if (state.isProcessing) return;

    // ذخیره وضعیت فعلی
    const urlValue = Utils.$('url-input')?.value || '';

    buildApp();

    // بازیابی مقدار URL
    const urlInput = Utils.$('url-input');
    if (urlInput && urlValue) {
      urlInput.value = urlValue;
    }
  }

  // ──────────────────────────────────────────────
  // ۲۰. Public API
  // ──────────────────────────────────────────────
  return {
    // Build
    buildApp,

    // State
    setProcessing,
    isProcessing: () => state.isProcessing,

    // Progress
    updateProgress,
    showResult,
    showError,
    hideError,

    // Form
    resetForm,
    toggleSubtitle,

    // Notifications
    showNotification,
    showConfirm,

    // Timer
    startExpiryTimer,
  };

})();

// ──────────────────────────────────────────────
// Freeze the UI object
// ──────────────────────────────────────────────
Object.freeze(UI);
