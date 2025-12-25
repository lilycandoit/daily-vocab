# Privacy Policy for Daily Vocab Extension

**Last Updated: December 25, 2024**

## Overview

Daily Vocab ("we", "our", or "the extension") is committed to protecting your privacy. This privacy policy explains how our Chrome extension handles your data.

## Data Collection

**We do NOT collect, store, or transmit any personal data.**

### What Data is Stored Locally

The extension stores the following data **locally on your device** using Chrome's storage API:

1. **Saved Words**: Words you choose to save, including:
   - Word text
   - Pronunciation (IPA)
   - Translation
   - Context (sentence where you found the word)
   - Date saved
   - Review status

2. **Settings**: Your preferences, including:
   - Native language selection
   - Selection method (double-click, text selection, keyboard)
   - Tooltip preferences
   - Reminder settings
   - View preferences

3. **Statistics**: Learning progress data, including:
   - Total words saved
   - Review streaks
   - Last review date

### Chrome Sync

If you have Chrome Sync enabled, your extension **settings and preferences** will sync across your devices using Google's Chrome Sync service.

**Note**: Your saved words and statistics are stored in `storage.local` to provide high capacity. This means your word list is specific to the device you are currently using and is not synced across devices. This approach maximizes your privacy and ensures you have virtually unlimited space (5MB+) for your vocabulary list.

## Data Sharing

**We do NOT share your data with any third parties.**

### External API Calls

The extension makes requests to the following free, public APIs to provide functionality:

1. **Dictionary API** (https://dictionaryapi.dev)
   - Purpose: Fetch word definitions and pronunciations
   - Data sent: The word you look up
   - No personal data is sent

2. **Google Translate & LibreTranslate Mirrors**
   - Purpose: Translate phrases and words to your native language
   - Primary: Google Translate (https://translate.googleapis.com)
   - Fallback: Argos Open Tech (https://translate.argosopentech.com)
   - Data sent: The text you look up and your target language
   - No personal data is sent

3. **Type.fit Quotes API** (https://type.fit/api/quotes)
   - Purpose: Display inspirational quotes in daily reminders
   - Data sent: None
   - No personal data is sent

These APIs are operated by third parties. Please refer to their respective privacy policies for more information.

## Permissions Explained

The extension requests the following permissions:

### Required Permissions

- **storage**: To save your words, settings, and statistics locally on your device
- **activeTab**: To read selected text or double-click words on webpages
- **alarms**: To schedule daily reminder notifications at 9 PM
- **notifications**: To display daily reminder notifications
- **offscreen**: To securely play audio pronunciation in a background context, ensuring it works on sites with strict security policies (like Notion and ChatGPT)

### Host Permissions

- **https://api.dictionaryapi.dev/**: Access Dictionary API for word definitions
- **https://translate.googleapis.com/**: Primary translation service (Google)
- **https://translate.argosopentech.com/**: Fallback translation service (Argos)
- **https://type.fit/**: Access quotes API for daily inspiration

## Data Security

- All data is stored locally on your device using Chrome's secure storage API
- No data is transmitted to our servers (we don't have any servers)
- No analytics or tracking is performed
- No cookies are used

## Your Rights

You have complete control over your data:

- **View your data**: Open the extension popup to see all saved words
- **Export your data**: Use the "Export Data" feature in Settings
- **Delete your data**: Use "Clear All Words" in Settings or uninstall the extension
- **Modify your data**: Edit or delete individual words anytime

## Children's Privacy

This extension does not knowingly collect any information from children under 13. The extension is designed for language learners of all ages and does not require any personal information.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date at the top of this policy.

## Open Source

Daily Vocab is open source software. You can review the complete source code at:
https://github.com/lilycandoit/daily-vocab

## Contact

If you have questions about this privacy policy or the extension, please:

- Open an issue on GitHub: https://github.com/lilycandoit/daily-vocab/issues
- Email: hueduong288@gmail.com

## Summary

**In plain English:**
- We don't collect your data
- Everything stays on your device
- We don't track you
- We don't sell anything
- You can delete everything anytime
- The extension only calls free, public APIs to look up words

---

**Daily Vocab respects your privacy. Your learning journey is yours alone.** 🎯
