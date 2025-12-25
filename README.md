# Daily Vocab — A Minimal Chrome Extension for Pronunciation & Vocabulary Review

> A minimal Chrome extension for non-native English speakers to quickly check pronunciation while reading, with intentional vocabulary review.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Purpose

Built for non-native English speakers who want quick pronunciation confirmation while reading English content, without heavy translation popups that break reading flow.

**Core Philosophy**: Separate quick lookup (pronunciation) from deep review (AI-powered learning later).

## ✨ Features

### Quick Lookup
- **Double-click any word** → See IPA pronunciation + brief translation
- **Audio playback** for correct pronunciation
- **Minimal tooltip** that doesn't interrupt reading
- **Save words** for later review (one click)

### Review & Learn
- **Card/List view** of saved words
- **Export to ChatGPT** with Australian English templates
- **Daily 9 PM reminders** for consistent learning
- **Search & filter** your vocabulary

### Customization
- **40+ languages** for translation (default: Vietnamese)
- **Selection methods**: Double-click, text selection, or keyboard shortcut
- **Configurable settings**: Tooltip timing, audio behavior, storage limits

## 🚀 Installation

### For Users
1. Download or clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → Select the `daily-vocab` folder
5. Pin the extension icon to your toolbar

### For Developers
```bash
git clone https://github.com/yourusername/daily-vocab.git
cd daily-vocab
# Open chrome://extensions/ and load unpacked
```

## 🧭 How to Use Daily Vocab Effectively

1. **Read normally** — Double-click unfamiliar words to check pronunciation
2. **Save useful words** with one click (💾 button in tooltip)
3. **Review your list** anytime in the popup (we'll remind you at 9 PM daily if you're busy)
4. **Export your word list** with pre-designed prompts to send to ChatGPT or your favorite AI for deep explanations
5. **Repeat daily** for consistent progress

> **Pro tip**: Don't save too many words at once! Focus on 10-20 words per day for better retention.

## � Usage

### Daily Workflow
1. **While Reading**: Double-click unknown words → Click 💾 to save
2. **Evening Review**: Click extension icon → Review saved words
3. **Deep Learning**: Export to ChatGPT for detailed explanations
4. **Track Progress**: Monitor statistics and streaks

### Keyboard Shortcuts
- `Ctrl+Shift+D` (or `Cmd+Shift+D`): Look up selected word
- Configure custom shortcuts in `chrome://extensions/shortcuts`

## 🏗️ Architecture

```
daily-vocab/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker (proxy audio, manage alarms)
├── offscreen.html/js      # Secure audio playback background context
├── content.js/css         # Word selection & tooltips
├── popup.html/js/css      # Review interface
├── options.html/js        # Settings page
└── utils/
    ├── api.js             # Dictionary & translation APIs
    ├── storage.js         # Chrome storage management
    └── cache.js           # Performance caching
```

## 🔧 Technical Stack

- **Manifest V3** (latest Chrome extension standard)
- **Vanilla JavaScript** (no frameworks)
- **Chrome Storage API**:
  - `storage.sync`: Settings and preferences (sync across devices)
  - `storage.local`: Vocabulary data and statistics (high capacity)
- **Offscreen API**: Secure background audio playback (bypasses CSP)
- **Free APIs**:
  - [Dictionary API](https://dictionaryapi.dev/) - IPA & definitions
  - [LibreTranslate](https://libretranslate.com/) - Phrase translation
  - [Type.fit Quotes](https://type.fit/api/quotes) - Daily inspiration

## � Language Support

**Primary**: Vietnamese (Tiếng Việt)
**Supported**: 40+ languages including Spanish, French, German, Chinese, Japanese, Korean, Arabic, Hindi, Thai, and more.

## ⚙️ Configuration

Access settings via:
- Right-click extension icon → **Options**
- Or click **Settings** in the popup

### Key Settings
- **Native Language**: Choose translation language
- **Selection Method**: Double-click, text selection, or keyboard
- **Daily Reminder**: Enable/disable 9 PM notifications
- **Storage Limit**: Max words to save (default: 200)
- **Cache**: Enable for better performance

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built this for my learning English journey, in my own way, hope it can help a bit!
- Dictionary data from [Free Dictionary API](https://dictionaryapi.dev/)
- Translation powered by [LibreTranslate](https://libretranslate.com/)

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/lilycandoit/daily-vocab/issues)

---