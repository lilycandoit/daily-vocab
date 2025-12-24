// Cache management for Daily Vocab extension
// Improves performance by caching API responses and frequently accessed data

class WordCache {
  // Cache configuration
  static CACHE_PREFIX = 'cache_';
  static DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  static MAX_CACHE_SIZE = 1000; // Maximum number of cached items

  // Get cached item
  static async getCachedItem(key) {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const result = await chrome.storage.local.get(cacheKey);
      const cachedData = result[cacheKey];

      if (!cachedData) {
        return null;
      }

      // Check if cache has expired
      if (Date.now() > cachedData.expiresAt) {
        await this.removeCachedItem(key);
        return null;
      }

      // Update access statistics
      cachedData.accessCount = (cachedData.accessCount || 0) + 1;
      cachedData.lastAccessed = Date.now();
      await this.setCachedItem(key, cachedData.data, cachedData.ttl);

      return cachedData.data;
    } catch (error) {
      console.error('Error getting cached item:', error);
      return null;
    }
  }

  // Set cached item with TTL
  static async setCachedItem(key, data, ttl = this.DEFAULT_TTL) {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const cacheData = {
        data,
        cachedAt: Date.now(),
        expiresAt: Date.now() + ttl,
        ttl,
        accessCount: 1,
        lastAccessed: Date.now()
      };

      await chrome.storage.local.set({ [cacheKey]: cacheData });

      // Check cache size and cleanup if necessary
      await this.checkCacheSize();

      return true;
    } catch (error) {
      console.error('Error setting cached item:', error);
      return false;
    }
  }

  // Remove cached item
  static async removeCachedItem(key) {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      await chrome.storage.local.remove(cacheKey);
      return true;
    } catch (error) {
      console.error('Error removing cached item:', error);
      return false;
    }
  }

  // Clear all cache
  static async clearCache() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheKeys = Object.keys(allData).filter(key =>
        key.startsWith(this.CACHE_PREFIX)
      );

      if (cacheKeys.length > 0) {
        await chrome.storage.local.remove(cacheKeys);
      }

      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  // Clean up expired cache entries
  static async cleanupExpiredCache() {
    try {
      const allData = await chrome.storage.local.get();
      const now = Date.now();
      const keysToRemove = [];

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(this.CACHE_PREFIX) && value.expiresAt && now > value.expiresAt) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} expired cache entries`);
      }

      return keysToRemove.length;
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
      return 0;
    }
  }

  // Check cache size and remove least recently used items if necessary
  static async checkCacheSize() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheEntries = Object.entries(allData)
        .filter(([key]) => key.startsWith(this.CACHE_PREFIX))
        .map(([key, value]) => ({
          key,
          lastAccessed: value.lastAccessed || 0,
          accessCount: value.accessCount || 0
        }))
        .sort((a, b) => a.lastAccessed - b.lastAccessed); // Sort by last accessed (oldest first)

      if (cacheEntries.length > this.MAX_CACHE_SIZE) {
        const itemsToRemove = cacheEntries.slice(0, cacheEntries.length - this.MAX_CACHE_SIZE);
        const keysToRemove = itemsToRemove.map(entry => entry.key);

        await chrome.storage.local.remove(keysToRemove);
        console.log(`Removed ${keysToRemove.length} cache entries to maintain size limit`);
      }

      return cacheEntries.length;
    } catch (error) {
      console.error('Error checking cache size:', error);
      return 0;
    }
  }

  // Get cache statistics
  static async getCacheStats() {
    try {
      const allData = await chrome.storage.local.get();
      const now = Date.now();
      let totalEntries = 0;
      let expiredEntries = 0;
      let totalSize = 0;
      let totalAccessCount = 0;

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          totalEntries++;
          totalSize += JSON.stringify(value).length;
          totalAccessCount += value.accessCount || 0;

          if (value.expiresAt && now > value.expiresAt) {
            expiredEntries++;
          }
        }
      }

      return {
        totalEntries,
        expiredEntries,
        validEntries: totalEntries - expiredEntries,
        totalSize,
        totalAccessCount,
        averageAccessCount: totalEntries > 0 ? totalAccessCount / totalEntries : 0,
        maxSize: this.MAX_CACHE_SIZE,
        usagePercentage: (totalEntries / this.MAX_CACHE_SIZE) * 100
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  // Cache word data from API
  static async cacheWordData(word, userLanguage, wordData) {
    const cacheKey = `word_${word}_${userLanguage}`;
    return await this.setCachedItem(cacheKey, wordData);
  }

  // Get cached word data
  static async getCachedWordData(word, userLanguage) {
    const cacheKey = `word_${word}_${userLanguage}`;
    return await this.getCachedItem(cacheKey);
  }

  // Cache translation data
  static async cacheTranslation(phrase, targetLanguage, translationData) {
    const cacheKey = `translation_${phrase}_${targetLanguage}`;
    return await this.setCachedItem(cacheKey, translationData);
  }

  // Get cached translation
  static async getCachedTranslation(phrase, targetLanguage) {
    const cacheKey = `translation_${phrase}_${targetLanguage}`;
    return await this.getCachedItem(cacheKey);
  }

  // Cache supported languages
  static async cacheSupportedLanguages(languages) {
    return await this.setCachedItem('supported_languages', languages, 24 * 60 * 60 * 1000); // 24 hours
  }

  // Get cached supported languages
  static async getCachedSupportedLanguages() {
    return await this.getCachedItem('supported_languages');
  }

  // Cache random quote
  static async cacheRandomQuote(quote) {
    return await this.setCachedItem('daily_quote', quote, 12 * 60 * 60 * 1000); // 12 hours
  }

  // Get cached random quote
  static async getCachedRandomQuote() {
    return await this.getCachedItem('daily_quote');
  }

  // Pre-cache common words (optional performance optimization)
  static async preCacheCommonWords(userLanguage) {
    const commonWords = [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'I', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
      'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we'
    ];

    const cachePromises = commonWords.map(async (word) => {
      try {
        // Check if already cached
        const cached = await this.getCachedWordData(word, userLanguage);
        if (cached) return;

        // Cache the word (this would be called with actual API data)
        // For now, just create a placeholder
        await this.cacheWordData(word, userLanguage, { text: word, cached: true });
      } catch (error) {
        console.error(`Error pre-caching word "${word}":`, error);
      }
    });

    await Promise.all(cachePromises);
    console.log(`Pre-cached ${commonWords.length} common words`);
  }

  // Export cache data for debugging
  static async exportCacheData() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheData = {};

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          cacheData[key] = {
            ...value,
            size: JSON.stringify(value).length
          };
        }
      }

      return {
        cacheData,
        stats: await this.getCacheStats(),
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting cache data:', error);
      return null;
    }
  }

  // Optimize cache by removing least frequently used items
  static async optimizeCache() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheEntries = Object.entries(allData)
        .filter(([key]) => key.startsWith(this.CACHE_PREFIX))
        .map(([key, value]) => ({
          key,
          accessCount: value.accessCount || 0,
          lastAccessed: value.lastAccessed || 0,
          size: JSON.stringify(value).length
        }))
        .sort((a, b) => {
          // Sort by access frequency first, then by last accessed time
          if (a.accessCount !== b.accessCount) {
            return a.accessCount - b.accessCount;
          }
          return a.lastAccessed - b.lastAccessed;
        });

      // Remove bottom 20% of cache entries
      const removeCount = Math.floor(cacheEntries.length * 0.2);
      if (removeCount > 0) {
        const itemsToRemove = cacheEntries.slice(0, removeCount);
        const keysToRemove = itemsToRemove.map(entry => entry.key);

        await chrome.storage.local.remove(keysToRemove);
        console.log(`Optimized cache: removed ${keysToRemove.length} least frequently used items`);
      }

      return removeCount;
    } catch (error) {
      console.error('Error optimizing cache:', error);
      return 0;
    }
  }

  // Check if cache is enabled (for settings)
  static isCacheEnabled(settings) {
    return settings?.enableCache !== false; // Default to true
  }

  // Get cache TTL based on settings
  static getCacheTTL(settings) {
    const ttlDays = settings?.cacheTTLDays || 7;
    return ttlDays * 24 * 60 * 60 * 1000;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WordCache;
} else if (typeof window !== 'undefined') {
  window.WordCache = WordCache;
} else if (typeof self !== 'undefined') {
  self.WordCache = WordCache;
}