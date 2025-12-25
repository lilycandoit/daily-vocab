// Chrome storage management for Daily Vocab extension
// Handles both sync storage (for settings and words) and local storage (for cache)

class StorageManager {
  // Get data from sync storage
  static async get(keys) {
    try {
      return await chrome.storage.sync.get(keys);
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        return {};
      }
      console.error('Error getting data from sync storage:', error);
      return {};
    }
  }

  // Set data in sync storage
  static async set(data) {
    try {
      await chrome.storage.sync.set(data);
      return true;
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        return false;
      }
      console.error('Error setting data in sync storage:', error);
      return false;
    }
  }

  // Remove data from sync storage
  static async remove(keys) {
    try {
      await chrome.storage.sync.remove(keys);
      return true;
    } catch (error) {
      console.error('Error removing data from sync storage:', error);
      return false;
    }
  }

  // Clear all sync storage
  static async clear() {
    try {
      await chrome.storage.sync.clear();
      return true;
    } catch (error) {
      console.error('Error clearing sync storage:', error);
      return false;
    }
  }

  // Get data from local storage (for cache)
  static async getLocal(keys) {
    try {
      return await chrome.storage.local.get(keys);
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        return {};
      }
      console.error('Error getting data from local storage:', error);
      return {};
    }
  }

  // Set data in local storage
  static async setLocal(data) {
    try {
      await chrome.storage.local.set(data);
      return true;
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        return false;
      }
      console.error('Error setting data in local storage:', error);
      return false;
    }
  }

  // Remove data from local storage
  static async removeLocal(keys) {
    try {
      await chrome.storage.local.remove(keys);
      return true;
    } catch (error) {
      console.error('Error removing data from local storage:', error);
      return false;
    }
  }

  // Get all words
  static async getWords() {
    const result = await this.getLocal('words');
    return result.words || [];
  }

  // Save words array
  static async saveWords(words) {
    return await this.setLocal({ words });
  }

  // Add single word
  static async addWord(wordData) {
    const words = await this.getWords();

    // Check if word already exists
    const existingIndex = words.findIndex(w =>
      w.text.toLowerCase() === wordData.text.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Update existing word
      words[existingIndex] = {
        ...words[existingIndex],
        ...wordData,
        metadata: {
          ...words[existingIndex].metadata,
          dateSaved: new Date().toISOString(),
          reviewCount: (words[existingIndex].metadata?.reviewCount || 0) + 1
        }
      };
    } else {
      // Add new word
      const newWord = {
        id: this.generateId(),
        ...wordData,
        metadata: {
          dateSaved: new Date().toISOString(),
          selectionMethod: 'double-click',
          reviewCount: 0,
          lastReviewed: null,
          isReviewed: false
        }
      };

      words.push(newWord);
    }

    // Sort by date (newest first)
    words.sort((a, b) => new Date(b.metadata.dateSaved) - new Date(a.metadata.dateSaved));

    return await this.saveWords(words);
  }

  // Update word by ID
  static async updateWord(wordId, updates) {
    const words = await this.getWords();
    const index = words.findIndex(w => w.id === wordId);

    if (index >= 0) {
      words[index] = {
        ...words[index],
        ...updates,
        metadata: {
          ...words[index].metadata,
          ...updates.metadata
        }
      };

      return await this.saveWords(words);
    }

    return false;
  }

  // Delete word by ID
  static async deleteWord(wordId) {
    const words = await this.getWords();
    const filteredWords = words.filter(w => w.id !== wordId);

    return await this.saveWords(filteredWords);
  }

  // Get word by ID
  static async getWord(wordId) {
    const words = await this.getWords();
    return words.find(w => w.id === wordId);
  }

  // Search words by text
  static async searchWords(query) {
    const words = await this.getWords();
    const lowerQuery = query.toLowerCase();

    return words.filter(word =>
      word.text.toLowerCase().includes(lowerQuery) ||
      (word.translation && word.translation.toLowerCase().includes(lowerQuery)) ||
      (word.context && word.context.toLowerCase().includes(lowerQuery))
    );
  }

  // Get words by date range
  static async getWordsByDateRange(startDate, endDate) {
    const words = await this.getWords();
    const start = new Date(startDate);
    const end = new Date(endDate);

    return words.filter(word => {
      const wordDate = new Date(word.metadata.dateSaved);
      return wordDate >= start && wordDate <= end;
    });
  }

  // Get words added today
  static async getWordsAddedToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getWordsByDateRange(today, tomorrow);
  }

  // Get words added this week
  static async getWordsAddedThisWeek() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return await this.getWordsByDateRange(oneWeekAgo, new Date());
  }

  // Get unreviewed words
  static async getUnreviewedWords() {
    const words = await this.getWords();
    return words.filter(word => !word.metadata.isReviewed);
  }

  // Mark word as reviewed
  static async markWordAsReviewed(wordId) {
    return await this.updateWord(wordId, {
      metadata: {
        lastReviewed: new Date().toISOString(),
        isReviewed: true
      }
    });
  }

  // Reset all words to unreviewed
  static async resetAllWordsReviewStatus() {
    const words = await this.getWords();
    const updatedWords = words.map(word => ({
      ...word,
      metadata: {
        ...word.metadata,
        isReviewed: false
      }
    }));

    return await this.saveWords(updatedWords);
  }

  // Get settings
  static async getSettings() {
    const result = await this.get('settings');
    return result.settings || {};
  }

  // Update settings
  static async updateSettings(newSettings) {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };

    return await this.set({ settings: updatedSettings });
  }

  // Reset settings to defaults
  static async resetSettings() {
    const defaultSettings = {
      userLanguage: 'vi',
      maxPhraseLength: 50,
      maxWords: 200,
      reminderTime: '21:00',
      reminderEnabled: true,
      includeWeekends: true,
      viewMode: 'cards',
      groupBy: 'date',
      audioBehavior: 'click',
      selectionMethod: 'double-click',
      autoDismiss: 3000,
      tooltipPosition: 'auto'
    };

    return await this.set({ settings: defaultSettings });
  }

  // Get statistics
  static async getStatistics() {
    const result = await this.getLocal('statistics');
    return result.statistics || {};
  }

  // Update statistics
  static async updateStatistics(newStats) {
    const currentStats = await this.getStatistics();
    const updatedStats = { ...currentStats, ...newStats };
    return await this.setLocal({ statistics: updatedStats });
  }

  // Clear all statistics
  static async clearStatistics() {
    return await this.removeLocal('statistics');
  }

  // Calculate and update statistics
  static async refreshStatistics() {
    const words = await this.getWords();
    const stats = await this.getStatistics();

    const newStats = {
      totalWords: words.length,
      wordsThisWeek: (await this.getWordsAddedThisWeek()).length,
      currentStreak: await this.calculateStreak(),
      lastReviewDate: stats.lastReviewDate || null
    };

    return await this.updateStatistics(newStats);
  }

  // Calculate current streak
  static async calculateStreak() {
    const stats = await this.getStatistics();
    const lastReview = stats.lastReviewDate;

    if (!lastReview) return 0;

    const daysSinceReview = Math.floor(
      (Date.now() - new Date(lastReview)) / (1000 * 60 * 60 * 24)
    );

    return daysSinceReview <= 1 ? (stats.currentStreak || 0) : 0;
  }

  // Export data for backup
  static async exportData() {
    const words = await this.getWords();
    const settings = await this.getSettings();
    const statistics = await this.getStatistics();

    return {
      words,
      settings,
      statistics,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  // Import data from backup
  static async importData(data) {
    try {
      if (data.words) {
        await this.saveWords(data.words);
      }

      if (data.settings) {
        await this.set({ settings: data.settings });
      }

      if (data.statistics) {
        await this.set({ statistics: data.statistics });
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  // Get storage usage
  static async getStorageUsage() {
    try {
      // Get approximate usage by measuring data size
      const words = await this.getWords();
      const settings = await this.getSettings();
      const statistics = await this.getStatistics();

      const wordsSize = JSON.stringify(words).length;
      const settingsSize = JSON.stringify(settings).length;
      const statsSize = JSON.stringify(statistics).length;

      return {
        words: wordsSize,
        settings: settingsSize,
        statistics: statsSize,
        total: wordsSize + settingsSize + statsSize,
        wordsCount: words.length
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return null;
    }
  }

  // Generate unique ID
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Validate storage quota
  static async checkStorageQuota() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota - estimate.usage,
          percentageUsed: (estimate.usage / estimate.quota) * 100
        };
      }
    } catch (error) {
      console.error('Error checking storage quota:', error);
    }

    return null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
} else if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
} else if (typeof self !== 'undefined') {
  self.StorageManager = StorageManager;
}