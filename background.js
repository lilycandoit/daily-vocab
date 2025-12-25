// Background service worker for Daily Vocab extension
// Handles word processing, storage, alarms, and notifications

// Import utilities
importScripts('utils/storage.js');
importScripts('utils/api.js');

// handle migration of data from sync to local as sync is too small (8KB limit)
async function migrateStorage() {
  try {
    const syncData = await chrome.storage.sync.get(['words', 'statistics']);
    const localData = await chrome.storage.local.get(['words', 'statistics']);

    // Migrate words if they exist in sync but not local
    if (syncData.words && syncData.words.length > 0 && (!localData.words || localData.words.length === 0)) {
      console.log('Migrating words to local storage');
      await chrome.storage.local.set({ words: syncData.words });
    }

    // Migrate statistics
    if (syncData.statistics && !localData.statistics) {
      console.log('Migrating statistics to local storage');
      await chrome.storage.local.set({ statistics: syncData.statistics });
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
}

// Helper: Get next reminder time for an alarm
function getNextReminderTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime();
}

// Handle initialization
chrome.runtime.onInstalled.addListener(async (details) => {
  await migrateStorage();

  if (details.reason === 'install') {
    // Set default settings in sync storage (safe as it is small)
    await chrome.storage.sync.set({
      settings: {
        userLanguage: 'vi',
        selectionMethod: 'double-click',
        autoDismiss: 3000,
        reminderEnabled: true,
        reminderTime: '21:00',
        maxWords: 200
      },
      firstTimeUser: true
    });

    // Initialize words and statistics in local storage (much larger limit)
    await chrome.storage.local.set({
      words: [],
      statistics: {
        totalSaved: 0,
        totalReviewed: 0,
        currentStreak: 0,
        lastReviewDate: null,
        dailyQuotes: { lastQuote: null, quoteDate: null }
      }
    });

    // Create daily alarm
    chrome.alarms.create('daily-review', {
      when: getNextReminderTime('21:00'),
      periodInMinutes: 1440
    });
  }
});

// Storage Helpers
async function getWords() {
  const data = await chrome.storage.local.get('words');
  return data.words || [];
}

async function saveWords(words) {
  await chrome.storage.local.set({ words });
}

async function getStatistics() {
  const data = await chrome.storage.local.get('statistics');
  return data.statistics || {
    totalSaved: 0,
    totalReviewed: 0,
    currentStreak: 0,
    lastReviewDate: null
  };
}

async function saveStatistics(statistics) {
  await chrome.storage.local.set({ statistics });
}

// Alarms & Notifications
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'daily-review') {
    const settingsResult = await chrome.storage.sync.get('settings');
    const settings = settingsResult.settings || {};

    if (settings.reminderEnabled !== false) {
      const words = await getWords();
      if (words.length > 0) {
        chrome.notifications.create('review-reminder', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Daily Vocab Review',
          message: `You have ${words.length} words to review today! 📚`,
          buttons: [{ title: 'Start Review' }]
        });
      }
    }
  }
});

chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (notifId === 'review-reminder' && btnIdx === 0) {
    chrome.action.openPopup();
  }
});

// Message Handler Actions
async function saveWord(wordData) {
  const words = await getWords();
  const existingIndex = words.findIndex(w => w.text.toLowerCase() === wordData.text.toLowerCase());

  if (existingIndex >= 0) {
    words[existingIndex] = {
      ...words[existingIndex],
      ...wordData,
      metadata: {
        ...words[existingIndex].metadata,
        dateSaved: new Date().toISOString()
      }
    };
  } else {
    words.unshift({
      id: Date.now().toString(),
      ...wordData,
      metadata: {
        dateSaved: new Date().toISOString(),
        isReviewed: false,
        reviewCount: 0
      }
    });
  }

  // Enforce limit
  const settingsResult = await chrome.storage.sync.get('settings');
  const maxWords = settingsResult.settings?.maxWords || 200;
  if (words.length > maxWords) words.length = maxWords;

  await saveWords(words);

  // Update stats
  const stats = await getStatistics();
  stats.totalSaved = (stats.totalSaved || 0) + 1;
  await saveStatistics(stats);
}

async function updateWord(wordId, updates) {
  const words = await getWords();
  const index = words.findIndex(w => w.id === wordId);
  if (index >= 0) {
    words[index] = { ...words[index], ...updates };
    await saveWords(words);
  }
}

async function deleteWord(wordId) {
  const words = await getWords();
  const filtered = words.filter(w => w.id !== wordId);
  await saveWords(filtered);
}

async function markReviewComplete() {
  const stats = await getStatistics();
  const today = new Date().toDateString();
  const lastReview = stats.lastReviewDate ? new Date(stats.lastReviewDate).toDateString() : null;

  if (lastReview !== today) {
    stats.currentStreak = (stats.currentStreak || 0) + 1;
    stats.lastReviewDate = new Date().toISOString();
    stats.totalReviewed = (stats.totalReviewed || 0) + 1;
    await saveStatistics(stats);
  }
}

async function updateStatistics() {
  const words = await getWords();
  const stats = await getStatistics();

  // Update total words
  stats.totalWords = words.length;

  // Calculate words this week
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  stats.wordsThisWeek = words.filter(w => {
    const dateSaved = new Date(w.metadata.dateSaved);
    return dateSaved >= oneWeekAgo;
  }).length;

  await saveStatistics(stats);
}

// Helper to manage offscreen document for audio
async function playAudioBackground(audioUrl) {
  // Check if offscreen document exists
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (contexts.length === 0) {
    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play word pronunciation'
    });
  }

  // Send message to offscreen document
  chrome.runtime.sendMessage({
    target: 'offscreen',
    action: 'play-audio',
    audioUrl: audioUrl
  });
}

// Main Command Router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'playAudio':
          await playAudioBackground(message.audioUrl);
          sendResponse({ success: true });
          break;

        case 'getWordData':
          const data = await WordAPI.getWordData(message.text, message.userLanguage);
          sendResponse({ success: true, data });
          break;

        case 'getAudioData':
          const audioBase64 = await WordAPI.fetchAudioBase64(message.audioUrl);
          sendResponse({ success: true, audioData: audioBase64 });
          break;

        case 'saveWord':
          await saveWord(message.wordData);
          sendResponse({ success: true });
          break;

        case 'getWords':
          const wordsList = await getWords();
          sendResponse({ success: true, words: wordsList });
          break;

        case 'updateWord':
          await updateWord(message.wordId, message.updates);
          sendResponse({ success: true });
          break;

        case 'deleteWord':
          await deleteWord(message.wordId);
          sendResponse({ success: true });
          break;

        case 'markReviewComplete':
          await markReviewComplete();
          sendResponse({ success: true });
          break;

        case 'getSettings':
          const setRes = await chrome.storage.sync.get('settings');
          sendResponse({ success: true, settings: setRes.settings || {} });
          break;

        case 'updateSettings':
          await chrome.storage.sync.set({ settings: message.settings });
          sendResponse({ success: true });
          break;

        case 'getStatistics':
          const statRes = await getStatistics();
          sendResponse({ success: true, statistics: statRes });
          break;

        case 'clearAllWords':
          await saveWords([]);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background message error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true; // Keep channel open for async response
});