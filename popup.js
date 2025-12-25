// Popup JavaScript for Daily Vocab extension
// Handles review interface, word management, and export functionality

class DailyVocabPopup {
  constructor() {
    this.words = [];
    this.settings = {};
    this.statistics = {};
    this.currentView = 'cards';
    this.currentSort = 'date';
    this.searchQuery = '';
    this.isInitialized = false;

    this.init();
  }

  async init() {
    try {
      // Load data
      await this.loadData();

      // Set up event listeners
      this.setupEventListeners();

      // Render initial view
      this.renderView();

      // Update statistics display
      this.updateStats();

      // Check if first-time user and show welcome guide
      await this.checkFirstTimeUser();

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing popup:', error);
      this.showError('Failed to initialize popup');
    }
  }

  async loadData() {
    try {
      // Load in parallel for better performance
      const [wordsResponse, settingsResponse, statsResponse] = await Promise.all([
        chrome.runtime.sendMessage({ action: 'getWords' }),
        chrome.runtime.sendMessage({ action: 'getSettings' }),
        chrome.runtime.sendMessage({ action: 'getStatistics' })
      ]);

      if (wordsResponse && wordsResponse.success) {
        this.words = wordsResponse.words || [];
      }

      if (settingsResponse && settingsResponse.success) {
        this.settings = settingsResponse.settings || {};
        this.currentView = this.settings.viewMode || 'cards';
        this.currentSort = this.settings.groupBy || 'date';
      }

      if (statsResponse && statsResponse.success) {
        this.statistics = statsResponse.statistics || {};
      }

    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // View controls
    document.getElementById('cardViewBtn').addEventListener('click', () => {
      this.switchView('cards');
    });

    document.getElementById('listViewBtn').addEventListener('click', () => {
      this.switchView('list');
    });

    // Sort control
    document.getElementById('sortSelect').addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.sortWords();
      this.renderView();
    });

    // Search controls
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderView();
    });

    document.getElementById('searchBtn').addEventListener('click', () => {
      this.renderView();
    });

    // Footer actions
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.showExportModal();
    });

    document.getElementById('markAllReviewedBtn').addEventListener('click', () => {
      this.markAllAsReviewed();
    });

    document.getElementById('reviewCompleteBtn').addEventListener('click', () => {
      this.completeReviewSession();
    });

    // Footer links
    document.getElementById('howToUseLinkBtn').addEventListener('click', () => {
      this.showHowToUseModal();
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('statsBtn').addEventListener('click', () => {
      this.showStatsModal();
    });

    // Modal controls
    this.setupModalListeners();

    // How to use
    document.getElementById('howToUseBtn').addEventListener('click', () => {
      this.showHowToUseModal();
    });
  }

  setupModalListeners() {
    // Export modal
    document.getElementById('exportModalClose').addEventListener('click', () => {
      this.hideModal('exportModal');
    });

    document.getElementById('copyExportBtn').addEventListener('click', () => {
      this.copyToClipboard();
    });

    document.getElementById('openChatGBtn').addEventListener('click', () => {
      this.openChatGPT();
    });

    document.getElementById('promptSelect').addEventListener('change', () => {
      this.updateExportPreview();
    });

    // Stats modal
    document.getElementById('statsModalClose').addEventListener('click', () => {
      this.hideModal('statsModal');
    });

    document.getElementById('clearAllBtn').addEventListener('click', () => {
      this.clearAllWords();
    });

    document.getElementById('exportDataBtn').addEventListener('click', () => {
      this.exportAllData();
    });

    // How to use modal
    document.getElementById('howToUseModalClose').addEventListener('click', () => {
      this.hideModal('howToUseModal');
    });

    document.getElementById('startUsingBtn').addEventListener('click', () => {
      this.hideModal('howToUseModal');
    });

    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
  }

  switchView(view) {
    this.currentView = view;

    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    if (view === 'cards') {
      document.getElementById('cardViewBtn').classList.add('active');
      document.getElementById('wordCardsView').style.display = 'block';
      document.getElementById('wordListView').style.display = 'none';
    } else {
      document.getElementById('listViewBtn').classList.add('active');
      document.getElementById('wordCardsView').style.display = 'none';
      document.getElementById('wordListView').style.display = 'block';
    }

    // Save setting
    this.updateSetting('viewMode', view);

    // Re-render
    this.renderView();
  }

  getFilteredWords() {
    let filteredWords = [...this.words];

    // Apply search filter
    if (this.searchQuery) {
      filteredWords = filteredWords.filter(word =>
        word.text.toLowerCase().includes(this.searchQuery) ||
        (word.translation && word.translation.toLowerCase().includes(this.searchQuery)) ||
        (word.context && word.context.toLowerCase().includes(this.searchQuery))
      );
    }

    // Apply sorting
    this.sortWords();

    return filteredWords;
  }

  sortWords() {
    switch (this.currentSort) {
      case 'alphabetical':
        this.words.sort((a, b) => a.text.localeCompare(b.text));
        break;
      case 'type':
        this.words.sort((a, b) => {
          const typeComparison = a.type.localeCompare(b.type);
          if (typeComparison !== 0) return typeComparison;
          return a.text.localeCompare(b.text);
        });
        break;
      case 'date':
      default:
        this.words.sort((a, b) =>
          new Date(b.metadata.dateSaved) - new Date(a.metadata.dateSaved)
        );
        break;
    }
  }

  renderView() {
    const filteredWords = this.getFilteredWords();

    // Update word count
    document.getElementById('wordCount').textContent =
      `${filteredWords.length} word${filteredWords.length !== 1 ? 's' : ''}`;

    // Show appropriate state
    if (this.words.length === 0) {
      this.showEmptyState();
    } else if (filteredWords.length === 0) {
      this.showNoResultsState();
    } else {
      this.showWordList();

      if (this.currentView === 'cards') {
        this.renderCardView(filteredWords);
      } else {
        this.renderListView(filteredWords);
      }
    }
  }

  showEmptyState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('wordListContainer').style.display = 'none';
  }

  showNoResultsState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('wordListContainer').style.display = 'none';

    // Update empty state message
    const emptyTitle = document.querySelector('#emptyState h2');
    const emptyText = document.querySelector('#emptyState p');
    emptyTitle.textContent = 'No results found';
    emptyText.textContent = 'Try adjusting your search or filter criteria.';
  }

  showWordList() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('wordListContainer').style.display = 'block';
  }

  renderCardView(words) {
    const container = document.getElementById('wordCards');
    container.innerHTML = '';

    words.forEach(word => {
      const card = this.createWordCard(word);
      container.appendChild(card);
    });
  }

  createWordCard(word) {
    const card = document.createElement('div');
    card.className = `word-card ${word.metadata.isReviewed ? 'reviewed' : ''}`;
    card.dataset.wordId = word.id;

    const isPhrase = word.type === 'phrase';
    const dateAdded = new Date(word.metadata.dateSaved);
    const formattedDate = dateAdded.toLocaleDateString();

    card.innerHTML = `
      <div class="word-card-header">
        <div class="word-main">
          <div class="word-text">${this.escapeHtml(word.text)}</div>
          ${isPhrase ?
            '<div class="word-type">(phrase)</div>' :
            word.ipa ? `<div class="word-ipa">${this.escapeHtml(word.ipa)}</div>` : ''
          }
        </div>
        <div class="word-actions">
          ${!isPhrase && word.audio ?
            `<button class="btn btn-icon btn-audio" data-word-id="${word.id}" title="Play pronunciation">🔊</button>` :
            ''
          }
          <button class="btn btn-icon btn-delete" data-word-id="${word.id}" title="Delete word">🗑</button>
        </div>
      </div>

      ${word.translation ?
        `<div class="word-translation">${this.escapeHtml(word.translation)}</div>` :
        ''
      }

      ${word.context ?
        `<div class="word-card-actions">
          <div class="word-context">${this.escapeHtml(word.context)}</div>
          <div class="word-buttons">
            <button class="btn btn-small ${word.metadata.isReviewed ? 'btn-secondary' : 'btn-primary'}"
                    data-word-id="${word.id}" data-action="toggle-reviewed">
              ${word.metadata.isReviewed ? 'Reviewed' : 'Mark Reviewed'}
            </button>
          </div>
        </div>` :
        ''
      }

      <div class="word-date">Added ${formattedDate}</div>
    `;

    // Add event listeners
    this.addCardEventListeners(card);

    return card;
  }

  addCardEventListeners(card) {
    // Audio button
    const audioBtn = card.querySelector('.btn-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordId = e.target.dataset.wordId;
        this.playWordAudio(wordId);
      });
    }

    // Delete button
    const deleteBtn = card.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordId = e.target.dataset.wordId;
        this.deleteWord(wordId);
      });
    }

    // Toggle reviewed button
    const reviewBtn = card.querySelector('[data-action="toggle-reviewed"]');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wordId = e.target.dataset.wordId;
        this.toggleReviewed(wordId);
      });
    }
  }

  renderListView(words) {
    const container = document.getElementById('wordList');
    container.innerHTML = '';

    words.forEach(word => {
      const listItem = this.createWordListItem(word);
      container.appendChild(listItem);
    });
  }

  createWordListItem(word) {
    const item = document.createElement('div');
    item.className = `word-list-item ${word.metadata.isReviewed ? 'reviewed' : ''}`;
    item.dataset.wordId = word.id;

    const isPhrase = word.type === 'phrase';

    item.innerHTML = `
      <div class="word-list-text">${this.escapeHtml(word.text)}</div>
      <div class="word-list-info">
        ${isPhrase ? '<span>phrase</span>' : ''}
        ${word.translation ? `<span>${this.escapeHtml(word.translation)}</span>` : ''}
        <span>${word.metadata.isReviewed ? '✓' : ''}</span>
      </div>
    `;

    // Add click event for review toggle
    item.addEventListener('click', () => {
      this.toggleReviewed(word.id);
    });

    return item;
  }

  async playWordAudio(wordId) {
    try {
      const word = this.words.find(w => w.id === wordId);
      if (!word || !word.audio) return;

      // Use the background's offscreen logic for consistency and robustness
      await chrome.runtime.sendMessage({
        action: 'playAudio',
        audioUrl: WordAPI.getAudioUrl(word.audio)
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  async deleteWord(wordId) {
    if (!confirm('Are you sure you want to delete this word?')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'deleteWord',
        wordId: wordId
      });

      if (response && response.success) {
        // Remove from local array
        this.words = this.words.filter(w => w.id !== wordId);

        // Re-render
        this.renderView();
        this.updateStats();
      }
    } catch (error) {
      console.error('Error deleting word:', error);
      this.showError('Failed to delete word');
    }
  }

  async toggleReviewed(wordId) {
    try {
      const word = this.words.find(w => w.id === wordId);
      if (!word) return;

      const newReviewedStatus = !word.metadata.isReviewed;

      const response = await chrome.runtime.sendMessage({
        action: 'updateWord',
        wordId: wordId,
        updates: {
          metadata: {
            isReviewed: newReviewedStatus,
            lastReviewed: newReviewedStatus ? new Date().toISOString() : null
          }
        }
      });

      if (response && response.success) {
        // Update local word
        word.metadata.isReviewed = newReviewedStatus;
        if (newReviewedStatus) {
          word.metadata.lastReviewed = new Date().toISOString();
        }

        // Re-render
        this.renderView();
        this.updateStats();
      }
    } catch (error) {
      console.error('Error toggling reviewed status:', error);
      this.showError('Failed to update word');
    }
  }

  async markAllAsReviewed() {
    if (this.words.length === 0) return;

    const unreviewedWords = this.words.filter(w => !w.metadata.isReviewed);
    if (unreviewedWords.length === 0) {
      this.showMessage('All words are already reviewed!');
      return;
    }

    try {
      const updatePromises = unreviewedWords.map(word =>
        chrome.runtime.sendMessage({
          action: 'updateWord',
          wordId: word.id,
          updates: {
            metadata: {
              isReviewed: true,
              lastReviewed: new Date().toISOString()
            }
          }
        })
      );

      const responses = await Promise.all(updatePromises);

      if (responses.every(r => r && r.success)) {
        // Update local words
        this.words.forEach(word => {
          if (!word.metadata.isReviewed) {
            word.metadata.isReviewed = true;
            word.metadata.lastReviewed = new Date().toISOString();
          }
        });

        this.renderView();
        this.updateStats();
        this.showMessage(`Marked ${unreviewedWords.length} words as reviewed`);
      }
    } catch (error) {
      console.error('Error marking all as reviewed:', error);
      this.showError('Failed to mark words as reviewed');
    }
  }

  async completeReviewSession() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'markReviewComplete'
      });

      if (response && response.success) {
        this.showMessage('Review session completed! Great job! 🎉');

        // Update streak
        await this.updateStats();
      }
    } catch (error) {
      console.error('Error completing review session:', error);
      this.showError('Failed to complete review session');
    }
  }

  showExportModal() {
    document.getElementById('exportModal').style.display = 'flex';
    this.updateExportPreview();
  }

  updateExportPreview() {
    const promptType = document.getElementById('promptSelect').value;
    const filteredWords = this.getFilteredWords();

    if (filteredWords.length === 0) {
      document.getElementById('previewContent').textContent = 'No words to export';
      return;
    }

    const prompt = this.generatePrompt(promptType, filteredWords);
    document.getElementById('previewContent').textContent = prompt;
  }

  generatePrompt(type, words) {
    const wordList = words.map(word => {
      let line = `• ${word.text}`;

      if (word.ipa) {
        line += ` (${word.ipa})`;
      }

      if (word.translation) {
        line += ` - ${word.translation}`;
      }

      if (word.context) {
        line += `\n  Context: ${word.context}`;
      }

      return line;
    }).join('\n\n');

    const prompts = {
      'australian-usage': `Please explain these words with Australian English usage examples, phonetics, and natural context:\n\n${wordList}`,
      'comprehensive': `Provide detailed explanations including phonetics, synonyms, examples, and usage patterns for these words:\n\n${wordList}`,
      'pronunciation-focus': `Focus on pronunciation challenges, phonetic breakdown, and common mistakes for these words:\n\n${wordList}`,
      'context-examples': `Create natural, everyday examples (preferably Australian context) for these words:\n\n${wordList}`
    };

    return prompts[type] || prompts['australian-usage'];
  }

  async copyToClipboard() {
    try {
      const previewContent = document.getElementById('previewContent').textContent;

      await navigator.clipboard.writeText(previewContent);
      this.showMessage('Words copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.showError('Failed to copy to clipboard');
    }
  }

  openChatGPT() {
    const promptType = document.getElementById('promptSelect').value;
    const filteredWords = this.getFilteredWords();

    if (filteredWords.length === 0) {
      this.showError('No words to export');
      return;
    }

    const prompt = this.generatePrompt(promptType, filteredWords);
    const encodedPrompt = encodeURIComponent(prompt);

    const chatGPTUrl = `https://chat.openai.com/?q=${encodedPrompt}`;
    window.open(chatGPTUrl, '_blank');
  }

  showStatsModal() {
    document.getElementById('statsModal').style.display = 'flex';
    this.updateStatisticsDisplay();
  }

  async updateStatisticsDisplay() {
    try {
      // Get fresh statistics
      const response = await chrome.runtime.sendMessage({ action: 'getStatistics' });
      if (response && response.success) {
        const stats = response.statistics;

        document.getElementById('totalWordsStat').textContent = stats.totalWords || 0;
        document.getElementById('wordsThisWeekStat').textContent = stats.wordsThisWeek || 0;
        document.getElementById('currentStreakStat').textContent = stats.currentStreak || 0;

        const unreviewedCount = this.words.filter(w => !w.metadata.isReviewed).length;
        document.getElementById('unreviewedStat').textContent = unreviewedCount;

        // Update storage usage
        this.updateStorageDisplay();
      }
    } catch (error) {
      console.error('Error updating statistics display:', error);
    }
  }

  async updateStorageDisplay() {
    try {
      const storageUsage = await StorageManager.getStorageUsage();
      if (storageUsage) {
        const percentage = Math.min((storageUsage.total / 102400) * 100, 100); // 100KB limit
        document.getElementById('storageFill').style.width = `${percentage}%`;
        document.getElementById('storageText').textContent =
          `${Math.round(storageUsage.total / 1024)}KB used (${Math.round(percentage)}%)`;
      }
    } catch (error) {
      document.getElementById('storageText').textContent = 'Storage info unavailable';
    }
  }

  showHowToUseModal() {
    document.getElementById('howToUseModal').style.display = 'flex';
  }

  hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
  }

  async clearAllWords() {
    if (!confirm('Are you sure you want to delete all words? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({ action: 'clearAllWords' });

      if (response && response.success) {
        this.words = [];
        this.renderView();
        this.updateStats();
        this.hideModal('statsModal');
        this.showMessage('All words cleared');
      }
    } catch (error) {
      console.error('Error clearing all words:', error);
      this.showError('Failed to clear words');
    }
  }

  async exportAllData() {
    try {
      const data = await StorageManager.exportData();
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-vocab-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showMessage('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showError('Failed to export data');
    }
  }

  async updateSetting(key, value) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { [key]: value }
      });

      if (response && response.success) {
        this.settings[key] = value;
      }
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  }

  async checkFirstTimeUser() {
    try {
      const result = await chrome.storage.sync.get('firstTimeUser');
      if (result.firstTimeUser === true) {
        // Show welcome modal
        this.showHowToUseModal();
        // Clear the flag so it doesn't show again
        await chrome.storage.sync.set({ firstTimeUser: false });
      }
    } catch (error) {
      console.error('Error checking first-time user:', error);
    }
  }

  async updateStats() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getStatistics'
      });

      if (response && response.success) {
        this.statistics = response.statistics;
        this.updateStats();
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  updateStats() {
    // Update header statistics
    const unreviewedCount = this.words.filter(w => !w.metadata.isReviewed).length;
    document.getElementById('wordCount').textContent =
      `${this.words.length} word${this.words.length !== 1 ? 's' : ''}`;
  }

  showMessage(message) {
    // Simple message display (could be enhanced with toast notifications)
    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success-color);
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: var(--shadow);
      z-index: 10000;
      max-width: 300px;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    `;

    document.body.appendChild(messageDiv);

    // Animate in
    requestAnimationFrame(() => {
      messageDiv.style.opacity = '1';
      messageDiv.style.transform = 'translateY(0)';
    });

    // Remove after 3 seconds
    setTimeout(() => {
      messageDiv.style.opacity = '0';
      messageDiv.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        document.body.removeChild(messageDiv);
      }, 300);
    }, 3000);
  }

  showError(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-error';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--error-color);
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: var(--shadow);
      z-index: 10000;
      max-width: 300px;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    `;

    document.body.appendChild(messageDiv);

    // Animate in
    requestAnimationFrame(() => {
      messageDiv.style.opacity = '1';
      messageDiv.style.transform = 'translateY(0)';
    });

    // Remove after 5 seconds
    setTimeout(() => {
      messageDiv.style.opacity = '0';
      messageDiv.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        document.body.removeChild(messageDiv);
      }, 300);
    }, 5000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DailyVocabPopup();
});

// Export for testing
if (typeof window !== 'undefined') {
  window.DailyVocabPopup = DailyVocabPopup;
}