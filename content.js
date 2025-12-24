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

      console.log('Daily Vocab content script initialized');
    } catch (error) {
      console.error('Error initializing content script:', error);
    }
  }

  async loadSettings() {
    // Default settings to use as fallback
    const defaultSettings = {
      userLanguage: 'vi',
      maxPhraseLength: 50,
      selectionMethod: 'double-click',
      autoDismiss: 3000,
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
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && this.isValidText(selectedText)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      this.showTooltip(selectedText, rect);
    }
  }

  handleTextSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && this.isValidText(selectedText)) {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        this.showTooltip(selectedText, rect);
      }, 100);
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
    if (this.isVisible && !this.tooltip.contains(event.target)) {
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

      // Position tooltip
      this.positionTooltip(rect);

      // Populate tooltip content
      this.populateTooltip(wordData);

      // Show tooltip
      this.showTooltipElement();

      // Set up auto-dismiss
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
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;

    let top, left;

    // Determine vertical position
    const spaceAbove = rect.top - scrollY;
    const spaceBelow = viewportHeight - rect.bottom - scrollY;

    if (spaceBelow >= tooltipRect.height + 10) {
      // Position below the text
      top = rect.bottom + scrollY + 5;
    } else if (spaceAbove >= tooltipRect.height + 10) {
      // Position above the text
      top = rect.top + scrollY - tooltipRect.height - 5;
    } else {
      // Not enough space, position at viewport edge
      top = scrollY + 10;
    }

    // Determine horizontal position
    const tooltipWidth = tooltipRect.width;
    const textCenter = rect.left + rect.width / 2;

    if (textCenter - tooltipWidth / 2 >= 0 && textCenter + tooltipWidth / 2 <= viewportWidth) {
      // Center horizontally with the text
      left = textCenter - tooltipWidth / 2;
    } else if (rect.left >= tooltipWidth) {
      // Position to the left of the text
      left = rect.left - tooltipWidth - 5;
    } else {
      // Position to the right of the text
      left = rect.right + 5;
    }

    // Apply positioning
    this.tooltip.style.position = 'absolute';
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

    // Prevent tooltip clicks from propagating
    this.tooltip.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  playAudio(audioUrl) {
    if (!audioUrl || !this.audioElement) return;

    try {
      // Format audio URL
      const formattedUrl = WordAPI.getAudioUrl(audioUrl);

      this.audioElement.src = formattedUrl;
      this.audioElement.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  }

  async saveWord(wordData) {
    try {
      // Get context from surrounding text
      const context = this.getContext(wordData.text);

      // Get page information
      const pageInfo = this.getPageInfo();

      // Prepare word data for saving
      const wordToSave = {
        ...wordData,
        context: context,
        source: pageInfo
      };

      // Save word via background script
      const response = await chrome.runtime.sendMessage({
        action: 'saveWord',
        wordData: wordToSave
      });

      if (!response || !response.success) {
        throw new Error((response && response.error) || 'Failed to save word');
      }

      console.log('Word saved successfully');
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.log('Daily Vocab: Extension context invalidated. Please refresh the page.');
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

    const autoDismiss = this.settings.autoDismiss || 3000;
    if (autoDismiss > 0) {
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

    const rect = {
      top: window.innerHeight / 2,
      bottom: window.innerHeight / 2,
      left: window.innerWidth / 2,
      right: window.innerWidth / 2
    };

    this.positionTooltip(rect);

    this.tooltip.innerHTML = `
      <div class="dv-tooltip-content dv-error">
        <div class="dv-error-message">${this.escapeHtml(message)}</div>
        <div class="dv-actions">
          <button class="dv-btn dv-btn-close" id="dv-close-btn">✕</button>
        </div>
      </div>
    `;

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