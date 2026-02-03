// Content script for Daily Vocab extension
// Handles word selection, tooltip display, and user interactions

class DailyVocabContent {
  constructor() {
    this.tooltip = null;
    this.isVisible = false;
    this.currentWordData = null;
    this.settings = {};
    this.userLanguage = 'vi';
    this.audioElement = null;
    this.dismissTimeout = null;

    this.init();
  }

  async init() {
    try {
      // Load settings
      await this.loadSettings();

      // Set up event listeners based on selection method
      this.setupEventListeners();

      // Create audio element for pronunciation
      this.createAudioElement();
    } catch (error) {
      console.error('Error initializing content script:', error);
    }
  }

  async loadSettings() {
    // Default settings to use as fallback
    const defaultSettings = {
      userLanguage: 'vi',
      maxPhraseLength: 50,
      selectionMethod: 'selection',
      autoDismiss: 0, // 0 = disabled (Google Translate style - stays open until user action)
      tooltipPosition: 'auto'
    };

    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });

      if (!response) {
        console.warn('Daily Vocab: No response received when loading settings. Using defaults.');
        this.settings = defaultSettings;
        this.userLanguage = defaultSettings.userLanguage;
        return;
      }

      if (response.success) {
        this.settings = response.settings || defaultSettings;
        this.userLanguage = this.settings.userLanguage || 'vi';
      } else {
        console.warn('Daily Vocab: Failed to load settings:', response.error, '. Using defaults.');
        this.settings = defaultSettings;
        this.userLanguage = defaultSettings.userLanguage;
      }
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.log('Daily Vocab: Extension context invalidated. Please refresh the page.');
        this.settings = defaultSettings;
        this.userLanguage = defaultSettings.userLanguage;
        return;
      }
      console.error('Error loading settings:', error, '. Using defaults.');
      this.settings = defaultSettings;
      this.userLanguage = defaultSettings.userLanguage;
    }
  }

  setupEventListeners() {
    const selectionMethod = this.settings.selectionMethod || 'double-click';

    switch (selectionMethod) {
      case 'double-click':
        document.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        break;
      case 'selection':
        document.addEventListener('mouseup', this.handleTextSelection.bind(this));
        break;
      case 'shortcut':
        document.addEventListener('keydown', this.handleKeyboardShortcut.bind(this));
        break;
      default:
        document.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    }

    // Global event listeners
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  createAudioElement() {
    this.audioElement = new Audio();
    this.audioElement.preload = 'none';
  }

  handleDoubleClick(event) {
    // Ignore clicks inside the tooltip
    if (this.tooltip && this.tooltip.contains(event.target)) {
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && this.isValidText(selectedText)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      this.showTooltip(selectedText, rect);
    }
  }

  handleTextSelection(event) {
    // Ignore clicks inside the tooltip
    if (this.tooltip && this.tooltip.contains(event.target)) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();

    if (selectedText && this.isValidText(selectedText)) {
      // CAPTURE selection range immediately before it can be cleared by clicks
      const range = selection.getRangeAt(0).cloneRange();

      // Small delay to let the browser finalize the selection UI
      setTimeout(() => {
        const rect = range.getBoundingClientRect();
        this.showTooltip(selectedText, rect);
      }, 50);
    }
  }

  handleKeyboardShortcut(event) {
    // Ctrl+Shift+D or Cmd+Shift+D
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
      event.preventDefault();

      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText && this.isValidText(selectedText)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        this.showTooltip(selectedText, rect);
      }
    }
  }

  handleKeyDown(event) {
    if (this.isVisible && event.key === 'Escape') {
      this.hideTooltip();
    }
  }

  handleDocumentClick(event) {
    if (this.isVisible && this.tooltip && !this.tooltip.contains(event.target)) {
      this.hideTooltip();
    }
  }

  isValidText(text) {
    const validation = WordAPI.validateInput(text, this.settings.maxPhraseLength || 50);
    return validation.valid;
  }

  async showTooltip(text, rect) {
    try {
      // Hide existing tooltip if showing
      if (this.isVisible) {
        this.hideTooltip();
      }

      // Get word data
      const wordData = await this.getWordData(text);
      if (!wordData) return;

      this.currentWordData = wordData;

      // Create tooltip element
      this.createTooltip();

      // Populate tooltip content first (so we can measure dimensions)
      this.populateTooltip(wordData);

      // Position tooltip (after content is populated)
      this.positionTooltip(rect);

      // Show tooltip
      this.showTooltipElement();

      // Set up auto-dismiss if enabled (0 = disabled, stays open until user action)
      // Tooltip closes when user: clicks outside, presses Escape, or selects new word
      this.setAutoDismiss();

    } catch (error) {
      console.error('Error showing tooltip:', error);
      this.showErrorTooltip(error.message);
    }
  }

  async getWordData(text) {
    try {
      // Check cache first
      const cacheKey = text.toLowerCase();
      let wordData = await WordCache.getCachedWordData(cacheKey, this.userLanguage);

      if (!wordData) {
        // Fetch from API
        const response = await chrome.runtime.sendMessage({
          action: 'getWordData',
          text: text,
          userLanguage: this.userLanguage
        });

        if (response && response.success) {
          wordData = response.data;

          // Cache the result
          await WordCache.cacheWordData(cacheKey, this.userLanguage, wordData);
        } else {
          throw new Error((response && response.error) || 'Failed to get word data');
        }
      }

      return wordData;
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.log('Daily Vocab: Extension context invalidated. Please refresh the page.');
        return null;
      }
      console.error('Error getting word data:', error);
      throw error;
    }
  }

  createTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
    }

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'daily-vocab-tooltip';
    this.tooltip.setAttribute('role', 'tooltip');
    this.tooltip.setAttribute('aria-live', 'polite');

    document.body.appendChild(this.tooltip);
  }

  positionTooltip(rect) {
    // Render tooltip off-screen first to measure dimensions
    this.tooltip.style.display = 'block';
    this.tooltip.style.opacity = '0';
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.top = '-9999px';
    this.tooltip.style.left = '-9999px';

    // Force layout to get accurate dimensions
    const tooltipHeight = this.tooltip.offsetHeight;
    const tooltipWidth = this.tooltip.offsetWidth;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;

    let top, left;
    const gap = 8; // Gap between text and tooltip
    const minSpaceRequired = tooltipHeight + gap;

    // Calculate available space in viewport
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Remove previous position classes
    this.tooltip.classList.remove('dv-tooltip-above', 'dv-tooltip-below');

    // Default: position below. Only go above if not enough space below
    if (spaceBelow >= minSpaceRequired) {
      // Position below the text (default)
      top = rect.bottom + scrollY + gap;
      this.tooltip.classList.add('dv-tooltip-below');
    } else if (spaceAbove >= minSpaceRequired) {
      // Position above the text (fallback)
      top = rect.top + scrollY - tooltipHeight - gap;
      this.tooltip.classList.add('dv-tooltip-above');
    } else {
      // Not enough space either way - pick the side with more space
      if (spaceBelow >= spaceAbove) {
        top = rect.bottom + scrollY + gap;
        this.tooltip.classList.add('dv-tooltip-below');
      } else {
        top = rect.top + scrollY - tooltipHeight - gap;
        this.tooltip.classList.add('dv-tooltip-above');
      }
    }

    // Determine horizontal position - center on text, but keep within viewport
    const textCenter = rect.left + rect.width / 2;

    // Try to center horizontally
    left = textCenter - tooltipWidth / 2;

    // Adjust if overflowing left edge
    if (left < 10) {
      left = 10;
    }
    // Adjust if overflowing right edge
    if (left + tooltipWidth > viewportWidth - 10) {
      left = viewportWidth - tooltipWidth - 10;
    }

    // Add scroll offset for absolute positioning
    left += scrollX;

    // Apply final positioning
    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.zIndex = '10000';
  }

  populateTooltip(wordData) {
    const isPhrase = wordData.type === 'phrase';

    let html = `
      <div class="dv-tooltip-content">
        <div class="dv-word-text">${this.escapeHtml(wordData.text)}</div>
    `;

    if (isPhrase) {
      html += `
        <div class="dv-word-type">(phrase)</div>
        <div class="dv-translation">${this.escapeHtml(wordData.translation)}</div>
      `;
    } else {
      // Single word
      if (wordData.ipa) {
        html += `<div class="dv-ipa">${this.escapeHtml(wordData.ipa)}</div>`;
      }

      if (wordData.translation) {
        html += `<div class="dv-translation">${this.escapeHtml(wordData.translation)}</div>`;
      }

      if (wordData.meaning) {
        html += `<div class="dv-meaning">${this.escapeHtml(wordData.meaning)}</div>`;
      }
    }

    html += `
        <div class="dv-actions">
    `;

    // Audio button for single words
    if (!isPhrase && wordData.audio) {
      html += `
        <button class="dv-btn dv-btn-audio" id="dv-audio-btn" title="Play pronunciation">
          🔊
        </button>
      `;
    }

    // Save button
    html += `
        <button class="dv-btn dv-btn-save" id="dv-save-btn" title="Save word">
          💾
        </button>
        <button class="dv-btn dv-btn-close" id="dv-close-btn" title="Close">
          ✕
        </button>
      `;

    html += `
        </div>
      </div>
    `;

    this.tooltip.innerHTML = html;

    // Add event listeners
    this.addTooltipEventListeners(wordData);
  }

  addTooltipEventListeners(wordData) {
    // Audio button
    const audioBtn = document.getElementById('dv-audio-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playAudio(wordData.audio);
      });
    }

    // Save button
    const saveBtn = document.getElementById('dv-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.saveWord(wordData);
        this.showSaveFeedback();
      });
    }

    // Close button
    const closeBtn = document.getElementById('dv-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideTooltip();
      });
    }

    // Prevent tooltip interactions from propagating to document
    this.tooltip.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    this.tooltip.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    this.tooltip.addEventListener('mouseup', (e) => {
      e.stopPropagation();
    });
  }

  async playAudio(audioUrl) {
    if (!audioUrl) return;

    try {
      // Format URL if it's relative
      const formattedUrl = WordAPI.getAudioUrl(audioUrl);

      // Send message to background to play audio in offscreen document
      // This bypasses the website's Content Security Policy (CSP)
      await chrome.runtime.sendMessage({
        action: 'playAudio',
        audioUrl: formattedUrl
      });
    } catch (error) {
      console.error('Error requesting audio playback:', error);
    }
  }

  async saveWord(wordData) {
    try {
      // Get context from surrounding text
      const context = this.getContext(wordData.text);

      // Get page information
      const pageInfo = this.getPageInfo();

      // Prepare word data for saving - ONLY save essential data to avoid quota issues
      const wordToSave = {
        text: wordData.text,
        type: wordData.type,
        ipa: wordData.ipa || '',
        audio: wordData.audio || '',
        translation: wordData.translation || '',
        meaning: wordData.meaning || '',
        context: context,
        source: {
          url: pageInfo.url,
          title: pageInfo.title.substring(0, 100), // Limit title length
          domain: pageInfo.domain
        }
      };

      // Save word via background script
      const response = await chrome.runtime.sendMessage({
        action: 'saveWord',
        wordData: wordToSave
      });

      if (!response || !response.success) {
        throw new Error((response && response.error) || 'Failed to save word');
      }
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.log('Daily Vocab: Extension context invalidated. Please refresh the page.');
        return;
      }
      if (error.message && error.message.includes('quota exceeded')) {
        console.error('Storage quota exceeded. Try deleting some old words.');
        alert('Storage full! Please delete some old words in the popup.');
        return;
      }
      console.error('Error saving word:', error);
    }
  }

  getContext(wordText) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return '';

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    // Get a larger context (±50 characters)
    const textContent = container.textContent || container.innerText;
    const wordIndex = textContent.indexOf(wordText);

    if (wordIndex === -1) return '';

    const start = Math.max(0, wordIndex - 50);
    const end = Math.min(textContent.length, wordIndex + wordText.length + 50);

    let context = textContent.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) context = '...' + context;
    if (end < textContent.length) context = context + '...';

    return context.trim();
  }

  getPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname
    };
  }

  showSaveFeedback() {
    const saveBtn = document.getElementById('dv-save-btn');
    if (saveBtn) {
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = '✓';
      saveBtn.style.backgroundColor = '#4CAF50';

      setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.style.backgroundColor = '';
      }, 1000);
    }
  }

  showTooltipElement() {
    this.tooltip.style.display = 'block';
    this.tooltip.style.opacity = '0';
    this.isVisible = true;

    // Fade in animation
    requestAnimationFrame(() => {
      this.tooltip.style.transition = 'opacity 0.2s ease-in-out';
      this.tooltip.style.opacity = '1';
    });
  }

  setAutoDismiss() {
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }

    // 0 = disabled (Google Translate style - stays open until user action)
    const autoDismiss = this.settings.autoDismiss;
    if (autoDismiss && autoDismiss > 0) {
      this.dismissTimeout = setTimeout(() => {
        this.hideTooltip();
      }, autoDismiss);
    }
  }

  hideTooltip() {
    if (!this.isVisible || !this.tooltip) return;

    // Clear auto-dismiss timeout
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
      this.dismissTimeout = null;
    }

    // Fade out animation
    this.tooltip.style.transition = 'opacity 0.2s ease-in-out';
    this.tooltip.style.opacity = '0';

    setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.style.display = 'none';
        this.tooltip.remove();
        this.tooltip = null;
      }
      this.isVisible = false;
      this.currentWordData = null;
    }, 200);
  }

  showErrorTooltip(message) {
    this.createTooltip();

    // Populate content first so we can measure dimensions
    this.tooltip.innerHTML = `
      <div class="dv-tooltip-content dv-error">
        <div class="dv-error-message">${this.escapeHtml(message)}</div>
        <div class="dv-actions">
          <button class="dv-btn dv-btn-close" id="dv-close-btn">✕</button>
        </div>
      </div>
    `;

    const rect = {
      top: window.innerHeight / 2,
      bottom: window.innerHeight / 2,
      left: window.innerWidth / 2,
      right: window.innerWidth / 2
    };

    this.positionTooltip(rect);

    const closeBtn = document.getElementById('dv-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideTooltip();
      });
    }

    this.showTooltipElement();

    // Auto-dismiss error after 3 seconds
    setTimeout(() => {
      this.hideTooltip();
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public method to update settings
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.userLanguage = this.settings.userLanguage || 'vi';
  }
}

// Initialize the content script
let dailyVocabContent;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    dailyVocabContent = new DailyVocabContent();
  });
} else {
  dailyVocabContent = new DailyVocabContent();
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateSettings' && dailyVocabContent) {
    dailyVocabContent.updateSettings(message.settings);
    sendResponse({ success: true });
  }

  return true;
});

// Export for testing
if (typeof window !== 'undefined') {
  window.DailyVocabContent = DailyVocabContent;
}