// API integration for Daily Vocab extension
// Handles dictionary API for single words and translation API for phrases

class WordAPI {
  // Main method to get word data (single word or phrase)
  static async getWordData(text, userLanguage = 'vi') {
    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new Error('Empty text provided');
    }

    const words = trimmedText.split(/\s+/);

    if (words.length === 1) {
      // Single word - use dictionary API for IPA and audio
      return await this.getSingleWordData(trimmedText);
    } else if (words.length <= 50) {
      // Phrase - use translation API
      return await this.getPhraseTranslation(trimmedText, userLanguage);
    } else {
      throw new Error('Text too long. Maximum 50 words for phrases.');
    }
  }

  // Get single word data from dictionary API
  static async getSingleWordData(word) {
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

      if (!response.ok) {
        throw new Error(`Dictionary API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error('Word not found in dictionary');
      }

      const wordData = data[0];

      // Extract IPA phonetics
      let ipa = wordData.phonetic || '';
      let audio = '';

      // Find best phonetic entry with audio
      if (wordData.phonetics && wordData.phonetics.length > 0) {
        const phoneticWithAudio = wordData.phonetics.find(p => p.audio);
        if (phoneticWithAudio) {
          ipa = phoneticWithAudio.text || ipa;
          audio = phoneticWithAudio.audio;
        } else if (wordData.phonetics[0]) {
          ipa = wordData.phonetics[0].text || ipa;
        }
      }

      // Extract first meaning for context
      let firstMeaning = '';
      if (wordData.meanings && wordData.meanings.length > 0) {
        const meaning = wordData.meanings[0];
        if (meaning.definitions && meaning.definitions.length > 0) {
          firstMeaning = meaning.definitions[0].definition || '';
        }
      }

      return {
        text: wordData.word,
        type: 'single-word',
        ipa: ipa,
        audio: audio,
        meaning: firstMeaning,
        meanings: wordData.meanings || [],
        origin: wordData.origin || ''
      };

    } catch (error) {
      console.error('Error fetching single word data:', error);
      throw new Error(`Failed to get word data: ${error.message}`);
    }
  }

  // Get phrase translation from LibreTranslate
  static async getPhraseTranslation(phrase, targetLanguage) {
    try {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: phrase,
          source: 'en',
          target: targetLanguage,
          format: 'text'
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.translatedText) {
        throw new Error('Translation failed');
      }

      return {
        text: phrase,
        type: 'phrase',
        translation: data.translatedText,
        sourceLanguage: 'en',
        targetLanguage: targetLanguage
      };

    } catch (error) {
      console.error('Error fetching phrase translation:', error);
      throw new Error(`Failed to translate phrase: ${error.message}`);
    }
  }

  // Get supported languages from LibreTranslate
  static async getSupportedLanguages() {
    try {
      const response = await fetch('https://libretranslate.com/languages');

      if (!response.ok) {
        throw new Error(`Languages API error: ${response.status}`);
      }

      const languages = await response.json();

      // Map of common language names
      const languageNames = {
        'vi': 'Vietnamese',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'th': 'Thai',
        'tl': 'Tagalog',
        'it': 'Italian',
        'nl': 'Dutch',
        'sv': 'Swedish',
        'pl': 'Polish',
        'tr': 'Turkish',
        'uk': 'Ukrainian',
        'ur': 'Urdu',
        'bn': 'Bengali',
        'ta': 'Tamil',
        'te': 'Telugu',
        'ml': 'Malayalam',
        'kn': 'Kannada',
        'gu': 'Gujarati',
        'pa': 'Punjabi',
        'mr': 'Marathi',
        'ne': 'Nepali',
        'si': 'Sinhala',
        'my': 'Myanmar',
        'km': 'Khmer',
        'lo': 'Lao',
        'ka': 'Georgian',
        'hy': 'Armenian',
        'az': 'Azerbaijani',
        'kk': 'Kazakh',
        'ky': 'Kyrgyz',
        'uz': 'Uzbek',
        'mn': 'Mongolian',
        'bo': 'Tibetan',
        'dv': 'Dhivehi',
        'ps': 'Pashto',
        'sd': 'Sindhi',
        'ckb': 'Kurdish (Sorani)',
        'fa': 'Persian',
        'he': 'Hebrew',
        'yi': 'Yiddish',
        'id': 'Indonesian',
        'ms': 'Malay',
        'jv': 'Javanese',
        'su': 'Sundanese',
        'mg': 'Malagasy',
        'ny': 'Chichewa',
        'sn': 'Shona',
        'ts': 'Tsonga',
        'tn': 'Tswana',
        've': 'Venda',
        'xh': 'Xhosa',
        'zu': 'Zulu',
        'af': 'Afrikaans',
        'is': 'Icelandic',
        'ga': 'Irish',
        'gd': 'Scottish Gaelic',
        'cy': 'Welsh',
        'eu': 'Basque',
        'ca': 'Catalan',
        'gl': 'Galician',
        'mt': 'Maltese',
        'sq': 'Albanian',
        'bs': 'Bosnian',
        'hr': 'Croatian',
        'sr': 'Serbian',
        'sl': 'Slovenian',
        'sk': 'Slovak',
        'cs': 'Czech',
        'hu': 'Hungarian',
        'ro': 'Romanian',
        'bg': 'Bulgarian',
        'mk': 'Macedonian',
        'et': 'Estonian',
        'lv': 'Latvian',
        'lt': 'Lithuanian',
        'fi': 'Finnish',
        'da': 'Danish',
        'no': 'Norwegian',
        'sv': 'Swedish',
        'en': 'English'
      };

      return languages.map(lang => ({
        code: lang.code,
        name: languageNames[lang.code] || lang.name,
        supported: true
      })).sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
      console.error('Error fetching supported languages:', error);

      // Fallback to common languages if API fails
      return [
        { code: 'vi', name: 'Vietnamese', supported: true },
        { code: 'es', name: 'Spanish', supported: true },
        { code: 'fr', name: 'French', supported: true },
        { code: 'de', name: 'German', supported: true },
        { code: 'zh', name: 'Chinese', supported: true },
        { code: 'ja', name: 'Japanese', supported: true },
        { code: 'ko', name: 'Korean', supported: true },
        { code: 'pt', name: 'Portuguese', supported: true },
        { code: 'ru', name: 'Russian', supported: true },
        { code: 'ar', name: 'Arabic', supported: true },
        { code: 'hi', name: 'Hindi', supported: true },
        { code: 'th', name: 'Thai', supported: true },
        { code: 'tl', name: 'Tagalog', supported: true },
        { code: 'it', name: 'Italian', supported: true },
        { code: 'nl', name: 'Dutch', supported: true }
      ];
    }
  }

  // Validate if language is supported
  static async isLanguageSupported(languageCode) {
    try {
      const languages = await this.getSupportedLanguages();
      return languages.some(lang => lang.code === languageCode);
    } catch (error) {
      console.error('Error checking language support:', error);
      return false;
    }
  }

  // Detect if text is a single word or phrase
  static detectTextType(text) {
    const words = text.trim().split(/\s+/);
    return words.length === 1 ? 'single-word' : 'phrase';
  }

  // Get audio URL for pronunciation (handle different formats)
  static getAudioUrl(audioPath) {
    if (!audioPath) return '';

    // Handle different audio URL formats
    if (audioPath.startsWith('http')) {
      return audioPath;
    } else if (audioPath.startsWith('//')) {
      return 'https:' + audioPath;
    } else {
      return 'https://' + audioPath;
    }
  }

  // Format IPA text for display
  static formatIPA(ipa) {
    if (!ipa) return '';

    // Clean up IPA formatting
    return ipa.replace(/^\//, '').replace(/\/$/, '');
  }

  // Extract word from selection (clean punctuation)
  static cleanWord(text) {
    return text.trim()
      .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
      .replace(/\s+/g, ' ') // Normalize spaces
      .toLowerCase();
  }

  // Validate text input
  static validateInput(text, maxLength = 50) {
    const trimmed = text.trim();

    if (!trimmed) {
      return { valid: false, error: 'Text cannot be empty' };
    }

    if (trimmed.length > maxLength * 10) { // Rough character limit
      return { valid: false, error: 'Text too long' };
    }

    const words = trimmed.split(/\s+/);
    if (words.length > maxLength) {
      return { valid: false, error: `Too many words (max ${maxLength})` };
    }

    return { valid: true };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WordAPI;
} else if (typeof window !== 'undefined') {
  window.WordAPI = WordAPI;
} else if (typeof self !== 'undefined') {
  self.WordAPI = WordAPI;
}