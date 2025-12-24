// Background service worker for Daily Vocab extension

// Import utilities
importScripts('utils/storage.js');
importScripts('utils/api.js');

// Initialize extension on installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Initialize default settings
    await initializeDefaultSettings();

    // Set up daily alarm for 9 PM
    await setupDailyAlarm();

    console.log('Daily Vocab extension installed successfully');
  }
});

// Initialize default settings
async function initializeDefaultSettings() {
  const defaultSettings = {
    userLanguage: 'vi', // Default Vietnamese
    maxPhraseLength: 50,
    maxWords: 200,
    reminderTime: '21:00', // 9 PM
    reminderEnabled: true,
    includeWeekends: true,
    viewMode: 'cards',
    groupBy: 'date',
    audioBehavior: 'click',
    selectionMethod: 'double-click',
    autoDismiss: 3000,
    tooltipPosition: 'auto'
  };

  // Check if settings already exist
  const existingSettings = await chrome.storage.sync.get('settings');
  if (!existingSettings.settings) {
    await chrome.storage.sync.set({ settings: defaultSettings });
  }

  // Initialize words array if empty
  const existingWords = await chrome.storage.sync.get('words');
  if (!existingWords.words) {
    await chrome.storage.sync.set({ words: [] });
  }

  // Initialize statistics
  const existingStats = await chrome.storage.sync.get('statistics');
  if (!existingStats.statistics) {
    const defaultStats = {
      totalWords: 0,
      wordsThisWeek: 0,
      currentStreak: 0,
      lastReviewDate: null,
      dailyQuotes: {
        lastQuote: null,
        quoteDate: null
      }
    };
    await chrome.storage.sync.set({ statistics: defaultStats });
  }
}

// Setup daily alarm for 9 PM
async function setupDailyAlarm() {
  const settings = await chrome.storage.sync.get('settings');
  const reminderTime = settings.settings?.reminderTime || '21:00';

  // Calculate next 9 PM
  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);

  const nextAlarm = new Date();
  nextAlarm.setHours(hours, minutes, 0, 0);

  // If time has passed today, set for tomorrow
  if (nextAlarm <= now) {
    nextAlarm.setDate(nextAlarm.getDate() + 1);
  }

  // Create alarm
  await chrome.alarms.create('daily-review', {
    when: nextAlarm.getTime(),
    periodInMinutes: 1440 // Repeat every 24 hours
  });

  console.log('Daily review alarm set for:', nextAlarm);
}

// Handle alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'daily-review') {
    await showDailyReminder();
  }
});

// Show daily reminder notification
async function showDailyReminder() {
  try {
    const settings = await chrome.storage.sync.get('settings');
    const words = await chrome.storage.sync.get('words');

    if (!settings.settings?.reminderEnabled) {
      return;
    }

    const wordCount = words.words?.length || 0;

    if (wordCount === 0) {
      return; // Don't show notification if no words to review
    }

    // Get random quote
    const quote = await getRandomQuote();

    // Create notification
    await chrome.notifications.create('daily-review', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Daily Vocabulary Review',
      message: `${wordCount} words to review tonight! 🌙\n"${quote.text}" - ${quote.author}`,
      requireInteraction: true,
      buttons: [
        { title: 'Review Now' },
        { title: 'Mark Complete' }
      ]
    });

    console.log('Daily reminder notification sent');
  } catch (error) {
    console.error('Error showing daily reminder:', error);
  }
}

// Get random quote from free API
async function getRandomQuote() {
  try {
    const response = await fetch('https://type.fit/api/quotes');
    const quotes = await response.json();
    return quotes[Math.floor(Math.random() * quotes.length)];
  } catch (error) {
    console.error('Error fetching quote:', error);
    // Fallback quote
    return {
      text: "The journey of a thousand miles begins with one step.",
      author: "Lao Tzu"
    };
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId === 'daily-review') {
    if (buttonIndex === 0) {
      // "Review Now" - Open popup
      chrome.action.openPopup();
    } else if (buttonIndex === 1) {
      // "Mark Complete" - Update statistics
      await markReviewComplete();
    }

    // Clear notification
    await chrome.notifications.clear(notificationId);
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId === 'daily-review') {
    // Open popup for review
    chrome.action.openPopup();
    await chrome.notifications.clear(notificationId);
  }
});

// Mark review session as complete
async function markReviewComplete() {
  const stats = await chrome.storage.sync.get('statistics');
  const statistics = stats.statistics || {};

  statistics.lastReviewDate = new Date().toISOString();

  // Update streak (simplified - could be more sophisticated)
  const today = new Date().toDateString();
  const lastReview = statistics.lastReviewDate ? new Date(statistics.lastReviewDate).toDateString() : null;

  if (lastReview !== today) {
    statistics.currentStreak = (statistics.currentStreak || 0) + 1;
  }

  await chrome.storage.sync.set({ statistics });
  console.log('Review session marked as complete');
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Wrap in async IIFE to properly handle async operations
  (async () => {
    try {
      switch (message.action) {
        case 'getWordData':
          const wordData = await WordAPI.getWordData(message.text, message.userLanguage);
          sendResponse({ success: true, data: wordData });
          break;

        case 'saveWord':
          await saveWord(message.wordData);
          sendResponse({ success: true });
          break;

        case 'getWords':
          const words = await chrome.storage.sync.get('words');
          sendResponse({ success: true, words: words.words || [] });
          break;

        case 'updateWord':
          await updateWord(message.wordId, message.updates);
          sendResponse({ success: true });
          break;

        case 'deleteWord':
          await deleteWord(message.wordId);
          sendResponse({ success: true });
          break;

        case 'getSettings':
          const settings = await chrome.storage.sync.get('settings');
          sendResponse({ success: true, settings: settings.settings || {} });
          break;

        case 'updateSettings':
          await updateSettings(message.settings);
          sendResponse({ success: true });
          break;

        case 'getStatistics':
          const statistics = await chrome.storage.sync.get('statistics');
          sendResponse({ success: true, statistics: statistics.statistics || {} });
          break;

        case 'clearAllWords':
          await chrome.storage.sync.set({ words: [] });
          sendResponse({ success: true });
          break;

        case 'resetSettings':
          await StorageManager.resetSettings();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});

// Save word to storage
async function saveWord(wordData) {
  const result = await chrome.storage.sync.get('words');
  const words = result.words || [];

  // Check if word already exists
  const existingIndex = words.findIndex(w => w.text.toLowerCase() === wordData.text.toLowerCase());

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
      id: generateId(),
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

  // Enforce word limit
  const settings = await chrome.storage.sync.get('settings');
  const maxWords = settings.settings?.maxWords || 200;

  if (words.length > maxWords) {
    // Remove oldest words beyond limit
    words.splice(maxWords);
  }

  await chrome.storage.sync.set({ words });

  // Update statistics
  await updateStatistics();
}

// Update word
async function updateWord(wordId, updates) {
  const result = await chrome.storage.sync.get('words');
  const words = result.words || [];

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

    await chrome.storage.sync.set({ words });
  }
}

// Delete word
async function deleteWord(wordId) {
  const result = await chrome.storage.sync.get('words');
  const words = result.words || [];

  const filteredWords = words.filter(w => w.id !== wordId);
  await chrome.storage.sync.set({ words: filteredWords });

  await updateStatistics();
}

// Update settings
async function updateSettings(newSettings) {
  const result = await chrome.storage.sync.get('settings');
  const settings = { ...result.settings, ...newSettings };

  await chrome.storage.sync.set({ settings });

  // If reminder settings changed, update alarm
  if (newSettings.reminderTime !== undefined || newSettings.reminderEnabled !== undefined) {
    await chrome.alarms.clear('daily-review');
    if (settings.reminderEnabled) {
      await setupDailyAlarm();
    }
  }
}

// Update statistics
async function updateStatistics() {
  const result = await chrome.storage.sync.get('words');
  const words = result.words || [];

  const statistics = {
    totalWords: words.length,
    wordsThisWeek: countWordsThisWeek(words),
    currentStreak: await calculateStreak(),
    lastReviewDate: new Date().toISOString()
  };

  await chrome.storage.sync.set({ statistics });
}

// Count words added this week
function countWordsThisWeek(words) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return words.filter(word =>
    new Date(word.metadata.dateSaved) > oneWeekAgo
  ).length;
}

// Calculate current streak
async function calculateStreak() {
  // Simplified streak calculation
  const stats = await chrome.storage.sync.get('statistics');
  const lastReview = stats.statistics?.lastReviewDate;

  if (!lastReview) return 0;

  const daysSinceReview = Math.floor(
    (Date.now() - new Date(lastReview)) / (1000 * 60 * 60 * 24)
  );

  return daysSinceReview <= 1 ? (stats.statistics.currentStreak || 0) : 0;
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Cleanup old cache entries periodically
chrome.alarms.create('cache-cleanup', {
  periodInMinutes: 1440 // Once daily
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cache-cleanup') {
    await cleanupCache();
  }
});

// Cleanup cache
async function cleanupCache() {
  const allData = await chrome.storage.local.get();
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago

  for (const key in allData) {
    if (key.startsWith('cache_') && allData[key].cachedAt < cutoff) {
      await chrome.storage.local.remove(key);
    }
  }

  console.log('Cache cleanup completed');
}