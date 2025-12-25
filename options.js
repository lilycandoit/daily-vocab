// Options JavaScript for Daily Vocab extension
// Handles settings management and configuration

class DailyVocabOptions {
  constructor() {
    this.settings = {};
    this.statistics = {};
    this.isDirty = false;

    this.init();
  }

  async init() {
    try {
      // Load current settings
      await this.loadSettings();

      // Set up event listeners
      this.setupEventListeners();

      // Update UI with current settings
      this.populateForm();

      // Load current statistics
      await this.loadStatistics();

      console.log('Daily Vocab options initialized');
    } catch (error) {
      console.error('Error initializing options:', error);
      this.showError('Failed to initialize options');
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response && response.success) {
        this.settings = response.settings || {};
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      throw error;
    }
  }

  async loadStatistics() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatistics' });
      if (response && response.success) {
        this.statistics = response.statistics || {};
        this.updateStatisticsDisplay();
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }

  setupEventListeners() {
    // Language settings
    document.getElementById('userLanguage').addEventListener('change', () => {
      this.markDirty();
    });

    document.getElementById('maxPhraseLength').addEventListener('input', (e) => {
      this.updateRangeValue('phraseLengthValue', e.target.value, 'words');
      this.markDirty();
    });

    // Word selection settings
    document.querySelectorAll('input[name="selectionMethod"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.markDirty();
      });
    });

    document.getElementById('tooltipPosition').addEventListener('change', () => {
      this.markDirty();
    });

    document.getElementById('autoDismiss').addEventListener('input', (e) => {
      this.updateRangeValue('autoDismissValue', e.target.value, 's');
      this.markDirty();
    });

    // Audio settings
    document.querySelectorAll('input[name="audioBehavior"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.markDirty();
      });
    });

    // Review settings
    document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.markDirty();
      });
    });

    document.getElementById('groupBy').addEventListener('change', () => {
      this.markDirty();
    });

    // Reminder settings
    document.getElementById('reminderEnabled').addEventListener('change', () => {
      this.markDirty();
    });

    document.getElementById('reminderTime').addEventListener('change', () => {
      this.markDirty();
    });

    document.getElementById('includeWeekends').addEventListener('change', () => {
      this.markDirty();
    });

    // Data management settings
    document.getElementById('maxWords').addEventListener('input', (e) => {
      this.updateRangeValue('maxWordsValue', e.target.value, '');
      this.markDirty();
    });

    document.getElementById('enableCache').addEventListener('change', () => {
      this.markDirty();
    });

    // Buttons
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetToDefaults();
    });

    document.getElementById('clearDataBtn').addEventListener('click', () => {
      this.clearAllData();
    });

    // Range inputs initial value updates
    document.getElementById('maxPhraseLength').addEventListener('input', (e) => {
      this.updateRangeValue('phraseLengthValue', e.target.value, 'words');
    });

    document.getElementById('autoDismiss').addEventListener('input', (e) => {
      this.updateRangeValue('autoDismissValue', e.target.value, 's');
    });

    document.getElementById('maxWords').addEventListener('input', (e) => {
      this.updateRangeValue('maxWordsValue', e.target.value, '');
    });

    // Warn on page leave if settings are dirty
    window.addEventListener('beforeunload', (e) => {
      if (this.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
  }

  populateForm() {
    // Language settings
    document.getElementById('userLanguage').value = this.settings.userLanguage || 'vi';
    document.getElementById('maxPhraseLength').value = this.settings.maxPhraseLength || 50;
    this.updateRangeValue('phraseLengthValue', this.settings.maxPhraseLength || 50, 'words');

    // Word selection settings
    const selectionMethod = this.settings.selectionMethod || 'selection';
    document.querySelector(`input[name="selectionMethod"][value="${selectionMethod}"]`).checked = true;

    document.getElementById('tooltipPosition').value = this.settings.tooltipPosition || 'auto';
    document.getElementById('autoDismiss').value = this.settings.autoDismiss || 5000;
    this.updateRangeValue('autoDismissValue', (this.settings.autoDismiss || 5000) / 1000, 's');

    // Audio settings
    const audioBehavior = this.settings.audioBehavior || 'click';
    document.querySelector(`input[name="audioBehavior"][value="${audioBehavior}"]`).checked = true;

    // Review settings
    const viewMode = this.settings.viewMode || 'cards';
    document.querySelector(`input[name="viewMode"][value="${viewMode}"]`).checked = true;

    document.getElementById('groupBy').value = this.settings.groupBy || 'date';

    // Reminder settings
    document.getElementById('reminderEnabled').checked = this.settings.reminderEnabled !== false;
    document.getElementById('reminderTime').value = this.settings.reminderTime || '21:00';
    document.getElementById('includeWeekends').checked = this.settings.includeWeekends !== false;

    // Data management settings
    document.getElementById('maxWords').value = this.settings.maxWords || 200;
    this.updateRangeValue('maxWordsValue', this.settings.maxWords || 200, '');

    document.getElementById('enableCache').checked = this.settings.enableCache !== false;

    this.isDirty = false;
    this.updateSaveButton();
  }

  updateRangeValue(elementId, value, suffix = '') {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value + suffix;
    }
  }

  async saveSettings() {
    try {
      // Collect form values
      const newSettings = {
        userLanguage: document.getElementById('userLanguage').value,
        maxPhraseLength: parseInt(document.getElementById('maxPhraseLength').value),
        selectionMethod: document.querySelector('input[name="selectionMethod"]:checked').value,
        tooltipPosition: document.getElementById('tooltipPosition').value,
        autoDismiss: parseInt(document.getElementById('autoDismiss').value),
        audioBehavior: document.querySelector('input[name="audioBehavior"]:checked').value,
        viewMode: document.querySelector('input[name="viewMode"]:checked').value,
        groupBy: document.getElementById('groupBy').value,
        reminderEnabled: document.getElementById('reminderEnabled').checked,
        reminderTime: document.getElementById('reminderTime').value,
        includeWeekends: document.getElementById('includeWeekends').checked,
        maxWords: parseInt(document.getElementById('maxWords').value),
        enableCache: document.getElementById('enableCache').checked
      };

      // Validate settings
      const validation = this.validateSettings(newSettings);
      if (!validation.valid) {
        this.showError(validation.error);
        return;
      }

      // Save settings via background script
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: newSettings
      });

      if (response && response.success) {
        this.settings = newSettings;
        this.isDirty = false;
        this.updateSaveButton();
        this.showMessage('Settings saved successfully!');

        // Notify content scripts of settings update
        const tabs = await chrome.tabs.query({});
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateSettings',
            settings: newSettings
          }).catch(() => {
            // Ignore errors for tabs that don't have content script
          });
        });
      } else {
        throw new Error(response.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Failed to save settings: ' + error.message);
    }
  }

  validateSettings(settings) {
    // Validate max phrase length
    if (settings.maxPhraseLength < 1 || settings.maxPhraseLength > 100) {
      return {
        valid: false,
        error: 'Maximum phrase length must be between 1 and 100 words'
      };
    }

    // Validate max words
    if (settings.maxWords < 10 || settings.maxWords > 1000) {
      return {
        valid: false,
        error: 'Maximum words must be between 10 and 1000'
      };
    }

    // Validate auto dismiss time
    if (settings.autoDismiss < 0 || settings.autoDismiss > 10000) {
      return {
        valid: false,
        error: 'Auto dismiss time must be between 0 and 10000 milliseconds'
      };
    }

    // Validate reminder time
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (settings.reminderTime && !timeRegex.test(settings.reminderTime)) {
      return {
        valid: false,
        error: 'Please enter a valid time in HH:MM format'
      };
    }

    return { valid: true };
  }

  async resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to their default values? This cannot be undone.')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ action: 'resetSettings' });

      if (response && response.success) {
        // Load default settings
        await this.loadSettings();
        this.populateForm();
        this.showMessage('Settings reset to defaults');
      } else {
        throw new Error(response.error || 'Failed to reset settings');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showError('Failed to reset settings: ' + error.message);
    }
  }

  async clearAllData() {
    if (!confirm('Are you sure you want to delete ALL words and data? This action cannot be undone and will permanently delete:\n\n• All saved words\n• All statistics\n• All cache data\n\nThis cannot be recovered!')) {
      return;
    }

    try {
      // Clear words
      const wordsResponse = await chrome.runtime.sendMessage({ action: 'clearAllWords' });

      // Clear cache
      const cacheCleared = await WordCache.clearCache();

      if (wordsResponse && wordsResponse.success && cacheCleared) {
        // Reload statistics
        await this.loadStatistics();
        this.showMessage('All data cleared successfully');
      } else {
        throw new Error('Failed to clear some data');
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      this.showError('Failed to clear data: ' + error.message);
    }
  }

  async updateStatisticsDisplay() {
    try {
      // Update word count
      const wordsResponse = await chrome.runtime.sendMessage({ action: 'getWords' });
      if (wordsResponse && wordsResponse.success) {
        const wordCount = wordsResponse.words ? wordsResponse.words.length : 0;
        document.getElementById('currentWordsCount').textContent = wordCount;
      }

      // Update storage usage
      const storageUsage = await StorageManager.getStorageUsage();
      if (storageUsage) {
        const storageKB = Math.round(storageUsage.total / 1024);
        const storageMB = (storageKB / 1024).toFixed(2);
        document.getElementById('storageUsed').textContent =
          storageKB > 1024 ? `${storageMB} MB` : `${storageKB} KB`;
      }
    } catch (error) {
      console.error('Error updating statistics display:', error);
      document.getElementById('currentWordsCount').textContent = 'Error';
      document.getElementById('storageUsed').textContent = 'Error';
    }
  }

  markDirty() {
    this.isDirty = true;
    this.updateSaveButton();
  }

  updateSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    if (this.isDirty) {
      saveBtn.innerHTML = '<span>💾</span> Save Settings *';
      saveBtn.style.background = 'var(--warning-color)';
      saveBtn.style.borderColor = 'var(--warning-color)';
    } else {
      saveBtn.innerHTML = '<span>💾</span> Save Settings';
      saveBtn.style.background = 'var(--primary-color)';
      saveBtn.style.borderColor = 'var(--primary-color)';
    }
  }

  showMessage(message) {
    this.showToast(message, 'success');
  }

  showError(error) {
    this.showToast(error, 'error');
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Style the toast
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'var(--success-color)' : 'var(--error-color)'};
      color: white;
      padding: 12px 16px;
      border-radius: var(--radius);
      box-shadow: var(--shadow-hover);
      z-index: 10000;
      max-width: 350px;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
      font-size: 14px;
      line-height: 1.4;
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    // Remove after delay
    const duration = type === 'success' ? 3000 : 5000;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialize options when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DailyVocabOptions();
});

// Export for testing
if (typeof window !== 'undefined') {
  window.DailyVocabOptions = DailyVocabOptions;
}