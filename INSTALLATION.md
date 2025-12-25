# 🚀 Installation Guide for Daily Vocab Extension

## ✅ Extension Status
The Daily Vocab extension is **complete and ready to use!** All core functionality has been implemented:

### 🎯 Features Ready
- ✅ Word selection (double-click, selection, or keyboard shortcut)
- ✅ Minimal pronunciation tooltips with IPA and audio
- ✅ Vietnamese + 40+ language translations for phrases
- ✅ Card-based review interface with search and filtering
- ✅ Daily 9 PM reminders with inspirational quotes
- ✅ AI export with customizable prompts
- ✅ Comprehensive settings and statistics

## 🔧 Installation Instructions

### Method 1: Load Unpacked Extension (Recommended)
1. **Open Chrome browser**
2. **Navigate to Extensions**: `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"**
5. **Select the `daily-vocab` folder** (the one containing manifest.json)
6. **Pin the extension** (right-click icon → "Pin")

### Method 2: Check Icons
1. Ensure the `icons/` folder contains exactly 3 PNG files: `icon16.png`, `icon48.png`, and `icon128.png`.
2. These are included by default. If they are missing, the extension may not load correctly.

## 🎮 Quick Start Guide

### 1. First Time Setup
1. **Open Settings**: Right-click extension icon → "Options"
2. **Set Language**: Choose your native language (default: Vietnamese)
3. **Configure**: Adjust selection method, audio behavior, etc.

### 2. Start Learning
1. **Browse any webpage** with English content
2. **Double-click words** to see pronunciation and translation
3. **Click 💾 to save** words to your review list
4. **Click 🔊 to hear** pronunciation

### 3. Review Time (9 PM Daily)
1. **Click extension icon** to open review interface
2. **Use cards view** (default) for visual review
3. **Switch to list view** for quick scanning
4. **Mark words as reviewed** to track progress
5. **Export for AI**: Click "Export" → choose prompt → copy to ChatGPT

## 🔍 Testing the Extension

### Test Core Features
1. **Single Words**: Double-click "pronunciation" → should show IPA + audio
2. **Phrases**: Double-click "break a leg" → should show Vietnamese translation
3. **Audio**: Click 🔊 button → should play pronunciation
4. **Save**: Click 💾 → should save to review list

### Test Review System
1. **Open popup** → should show saved words
2. **Search**: Type in search box → should filter words
3. **Export**: Click Export → should generate formatted text for AI
4. **Settings**: All changes should save and persist

## 🐛 Troubleshooting

### Common Issues & Solutions

**Issue**: "Cannot read 'image.png'" error
- **Cause**: Missing icon files referenced in manifest.json
- **Solution**: Extension will work with Chrome's default icon, or generate icons using create-icons.html

**Issue**: "Extension not working"
- **Solutions**:
  1. Reload the extension (click reload icon in extensions page)
  2. Check Developer Tools console for errors
  3. Verify internet connection for API calls
  4. Try different selection method in settings

**Issue**: "Tooltip not appearing"
- **Solutions**:
  1. Check selection method settings
  2. Ensure JavaScript is enabled on the page
  3. Try refreshing the webpage
  4. Check if other extensions are interfering

**Issue**: "Audio not playing"
- **Solutions**:
  1. Check audio behavior setting (must be "click to play")
  2. Test network connection to dictionary API
  3. Check browser volume settings
  4. Try different words (some may not have audio)

## 🎨 Customization Ideas

Once you're comfortable, consider:
1. **Custom Prompts**: Create your own AI export templates
2. **Language Settings**: Experiment with different translation languages
3. **Review Workflow**: Find your optimal review schedule
4. **Keyboard Shortcuts**: Set up custom shortcuts for power users

## 📊 Advanced Usage

### Data Management
- **Export Data**: Settings page allows full data export/backup
- **Storage Monitoring**: Check storage usage in statistics
- **Word Limits**: Adjust maximum words based on your needs

### Performance Tips
- **Cache Enabled**: Improves loading for frequently accessed words
- **Sync**: Settings and preferences sync across devices with Chrome sync
- **Vocabulary Storage**: All saved words are stored in `storage.local` to ensure high capacity (5MB+). Words are device-specific to maximize privacy and speed.
- **Cleanup**: Regular export and deletion of old words

## 🚀 Ready to Go!

Your Daily Vocab extension is now ready to enhance your vocabulary learning journey!

**Key Benefits**:
- 🎯 Minimal distraction reading experience
- 🌍 Native language support for phrases
- 🔊 Audio pronunciation for words
- ⏰ Consistent daily review routine
- 🤖 AI-powered deep learning integration
- 📊 Progress tracking and statistics

Happy learning! 📚✨

---

**Extension Location**: `/Users/lily/Build/daily-vocab/`
**Main Files**: `manifest.json`, `background.js`, `content.js`, `popup.html`, `options.html`
**Utils**: Complete API, storage, and caching system
**Documentation**: Full README.md with detailed specifications