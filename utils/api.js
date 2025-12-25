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
      // Single word - fetch BOTH dictionary data AND translation
      const wordData = await this.getSingleWordData(trimmedText);

      try {
        // Only fetch translation if target language is NOT English
        if (userLanguage !== 'en') {
          const transResult = await this.getPhraseTranslation(trimmedText, userLanguage);
          wordData.translation = transResult.translation;
        }
      } catch (error) {
        console.warn('Daily Vocab: Single word translation failed:', error);
        // We still return wordData as it has the dictionary info
      }

      return wordData;
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

      // Aggregate data from all matching entries
      let ipa = '';
      let audio = '';
      const meaningsArr = [];
      let origin = '';

      for (const entry of data) {
        // Collect IPA
        if (!ipa && entry.phonetic) ipa = entry.phonetic;

        // Search through phonetics for audio and text
        if (entry.phonetics && entry.phonetics.length > 0) {
          for (const p of entry.phonetics) {
            if (!ipa && p.text) ipa = p.text;
            if (!audio && p.audio) audio = p.audio;
          }
        }

        // Collect meanings
        if (entry.meanings) {
          meaningsArr.push(...entry.meanings);
        }

        // Collect origin
        if (!origin && entry.origin) origin = entry.origin;
      }

      // Extract first meaning for quick display
      let firstMeaning = '';
      if (meaningsArr.length > 0) {
        const firstDef = meaningsArr[0].definitions[0];
        firstMeaning = firstDef ? firstDef.definition : '';
      }

      return {
        text: word,
        type: meaningsArr[0]?.partOfSpeech || 'word',
        ipa: ipa,
        audio: audio,
        meaning: firstMeaning,
        meanings: meaningsArr,
        origin: origin
      };

    } catch (error) {
      console.error('Error fetching single word data:', error);
      throw new Error(`Failed to get word data: ${error.message}`);
    }
  }

  // Fetch audio file and convert to base64 to bypass CSP
  static async fetchAudioBase64(audioUrl) {
    try {
      const url = this.getAudioUrl(audioUrl);
      if (!url) return null;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch audio file');

      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error fetching audio base64:', error);
      return null;
    }
  }

  // Get phrase translation using Google's reliable internal endpoint
  static async getPhraseTranslation(phrase, targetLanguage) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(phrase)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Google Translation error');
      }

      const data = await response.json();

      // Google returns a nested array: [[["translation", "source", ...]]]
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        // Concatenate all parts of the translation (Google might split long phrases)
        const translation = data[0].map(part => part[0]).join('');

        return {
          text: phrase,
          type: 'phrase',
          translation: translation,
          sourceLanguage: 'en',
          targetLanguage: targetLanguage
        };
      }

      throw new Error('Invalid translation format');
    } catch (error) {
      console.error('Error in Google Translation:', error);
      throw new Error('Translation service currently busy. Please try again.');
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
    } else if (audioPath.startsWith('/')) {
      return 'https://api.dictionaryapi.dev' + audioPath;
    } else {
      // Check if it's already a full domain without protocol
      if (audioPath.includes('.') && !audioPath.includes('/')) {
        return 'https://' + audioPath;
      }
      // Otherwise assume it's a relative path to the dictionary API
      return 'https://api.dictionaryapi.dev/' + audioPath;
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