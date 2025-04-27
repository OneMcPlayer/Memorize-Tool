/**
 * Text-to-Speech Service
 *
 * A comprehensive TTS service that combines multiple approaches:
 * 1. Web Speech API (native browser support)
 * 2. Google Translate TTS (fallback, no API key needed but has limitations)
 * 3. Support for character voices in script reading
 */

class TTSService {
  constructor() {
    // Initialize state
    this.initialized = false;
    this.webSpeechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.currentAudio = null;
    this.isSpeaking = false;
    this.userInteracted = false;
    this.voices = [];
    this.defaultVoice = null;
    this.characterVoices = {};
    this.demoMode = true; // Set to true initially, will be turned off in production

    // For testing purposes
    this.lastSpokenText = '';
    this.lastSpokenOptions = {};
    this.speakCalled = false;
    this.isTestMode = false;

    // Configuration
    this.config = {
      useWebSpeech: true,
      useGoogleTTS: true,
      useProxy: false,
      proxyUrl: '/api/tts-proxy',
      defaultVolume: 1.0,
      defaultRate: 1.0,
      defaultPitch: 1.0,
      googleTTSUrl: 'https://translate.google.com/translate_tts'
    };

    // Initialize if Web Speech API is available and not in test mode
    if (this.webSpeechAvailable && !this.isInTestEnvironment()) {
      this.initWebSpeech();
    }

    // Track user interaction to enable autoplay
    this.setupUserInteractionTracking();

    console.log('TTS Service initialized. Web Speech available:', this.webSpeechAvailable, 'Demo mode:', this.demoMode);
  }

  // Check if we're in a test environment
  isInTestEnvironment() {
    return typeof Cypress !== 'undefined' || this.isTestMode;
  }

  // Initialize Web Speech API
  initWebSpeech() {
    if (!this.webSpeechAvailable) return;

    // Load voices
    this.voices = window.speechSynthesis.getVoices();

    // If voices are not loaded yet, wait for them
    if (this.voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
        this.setupDefaultVoice();
        this.initialized = true;
      };
    } else {
      this.setupDefaultVoice();
      this.initialized = true;
    }
  }

  // Set up default voice based on browser language
  setupDefaultVoice() {
    const browserLang = navigator.language || 'en-US';

    // Try to find a voice that matches the browser language
    this.defaultVoice = this.voices.find(voice =>
      voice.lang.includes(browserLang) && !voice.localService
    );

    // Fallback to any non-local voice
    if (!this.defaultVoice) {
      this.defaultVoice = this.voices.find(voice => !voice.localService);
    }

    // Last resort: use any available voice
    if (!this.defaultVoice && this.voices.length > 0) {
      this.defaultVoice = this.voices[0];
    }

    console.log('Default voice set to:', this.defaultVoice ? this.defaultVoice.name : 'None');
  }

  // Track user interaction to enable autoplay
  setupUserInteractionTracking() {
    const interactionEvents = ['click', 'touchstart', 'keydown'];

    const handleUserInteraction = () => {
      this.userInteracted = true;

      // Remove event listeners once user has interacted
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });

      console.log('User interaction detected, audio autoplay should now be enabled');
    };

    // Add event listeners for user interaction
    interactionEvents.forEach(event => {
      document.addEventListener(event, handleUserInteraction);
    });
  }

  // Get all available voices
  getVoices() {
    return this.voices;
  }

  // Check if TTS is available
  isAvailable() {
    return this.webSpeechAvailable || this.config.useGoogleTTS;
  }

  // Speak text using the best available method
  async speak(text, options = {}) {
    if (!text || text.trim() === '') {
      console.log('Empty text, nothing to speak');
      return Promise.resolve();
    }

    // For testing purposes
    this.lastSpokenText = text;
    this.lastSpokenOptions = { ...options };
    this.speakCalled = true;

    // If in test mode, just simulate speaking
    if (this.isInTestEnvironment()) {
      console.log(`[TEST MODE] Speaking text: "${text.substring(0, 30)}..."`);
      this.isSpeaking = true;

      // Simulate speech duration based on text length and rate
      const duration = Math.min(Math.max(text.length * 50, 500), 3000);
      await new Promise(resolve => setTimeout(resolve, duration));

      this.isSpeaking = false;
      return Promise.resolve();
    }

    // Stop any current speech
    this.stop();

    // Set options with defaults
    const opts = {
      voice: options.voice || this.defaultVoice,
      volume: options.volume || this.config.defaultVolume,
      rate: options.rate || this.config.defaultRate,
      pitch: options.pitch || this.config.defaultPitch,
      lang: options.lang || (options.voice ? options.voice.lang : 'en-US')
    };

    console.log(`Speaking text: "${text.substring(0, 30)}..." with language: ${opts.lang}`);

    // Dispatch a custom event for testing purposes
    if (typeof document !== 'undefined') {
      const event = new CustomEvent('tts-speak-called', {
        detail: { text, options: opts }
      });
      document.dispatchEvent(event);
    }

    // Try Web Speech API first if enabled and available
    if (this.config.useWebSpeech && this.webSpeechAvailable) {
      try {
        await this.speakWithWebSpeech(text, opts);
        return;
      } catch (error) {
        console.warn('Web Speech API failed:', error);
        // Fall through to next method
      }
    }

    // Try Google TTS as fallback
    if (this.config.useGoogleTTS) {
      try {
        await this.speakWithGoogleTTS(text, opts);
        return;
      } catch (error) {
        console.error('Google TTS failed:', error);
        throw new Error('All TTS methods failed');
      }
    }

    throw new Error('No TTS method available');
  }

  // Speak using Web Speech API
  speakWithWebSpeech(text, options) {
    return new Promise((resolve, reject) => {
      if (!this.webSpeechAvailable) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);

      // Set options
      utterance.voice = options.voice;
      utterance.volume = options.volume;
      utterance.rate = options.rate;
      utterance.pitch = options.pitch;
      utterance.lang = options.lang;

      // Set up event handlers
      utterance.onend = () => {
        console.log('Web Speech completed');
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Web Speech error:', event);
        this.isSpeaking = false;
        reject(new Error(`Web Speech error: ${event.error}`));
      };

      // Start speaking
      window.speechSynthesis.speak(utterance);
      this.isSpeaking = true;

      // Chrome bug workaround - if speech doesn't start within 1 second, try again
      setTimeout(() => {
        if (this.isSpeaking && window.speechSynthesis.pending) {
          console.log('Speech did not start, trying again...');
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
      }, 1000);

      // Set a timeout to resolve the promise if speech doesn't end
      setTimeout(() => {
        if (this.isSpeaking) {
          console.log('Speech timeout, resolving promise');
          this.isSpeaking = false;
          resolve();
        }
      }, 15000); // 15 second timeout
    });
  }

  // Speak using Google Translate TTS
  speakWithGoogleTTS(text, options) {
    return new Promise((resolve, reject) => {
      try {
        // Clean up any previous audio
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio = null;
        }

        // Check if user has interacted with the page
        if (!this.userInteracted) {
          console.warn('User has not interacted with the page yet, audio may be blocked');
        }

        // Prepare the text - limit to 200 characters (Google Translate TTS API limit)
        const trimmedText = text.length > 200 ? text.substring(0, 197) + '...' : text;
        const encodedText = encodeURIComponent(trimmedText);

        // Get language code based on voice preference, default to English
        let langCode = 'en';
        if (options.lang) {
          // Extract primary language code (e.g., 'it' from 'it-IT')
          langCode = options.lang.split('-')[0];
        }

        // Create audio URL using Google Translate TTS API
        let audioUrl;
        if (this.config.useProxy) {
          // Use proxy to avoid CORS issues
          audioUrl = `${this.config.proxyUrl}?text=${encodedText}&lang=${langCode}`;
        } else {
          // Direct call (may have CORS issues)
          audioUrl = `${this.config.googleTTSUrl}?ie=UTF-8&q=${encodedText}&tl=${langCode}&client=tw-ob`;
        }

        // Create a new audio element
        this.currentAudio = new Audio();
        this.currentAudio.crossOrigin = "anonymous"; // Try to avoid CORS issues
        this.currentAudio.volume = options.volume;
        this.currentAudio.src = audioUrl;

        // Set up event handlers
        this.currentAudio.oncanplaythrough = () => {
          console.log('Google TTS audio ready to play');
        };

        this.currentAudio.onplay = () => {
          console.log('Google TTS audio playback started');
          this.isSpeaking = true;
        };

        this.currentAudio.onended = () => {
          console.log('Google TTS audio playback ended');
          this.isSpeaking = false;
          resolve();
        };

        this.currentAudio.onerror = (err) => {
          const errorMessage = err.target.error ? err.target.error.message : 'Unknown error';
          console.error('Google TTS audio error:', errorMessage);
          this.isSpeaking = false;
          reject(new Error(`Google TTS error: ${errorMessage}`));
        };

        // Try to play the audio
        this.currentAudio.play()
          .then(() => {
            console.log('Google TTS audio play started successfully');
          })
          .catch(err => {
            console.error('Google TTS audio play failed:', err);
            reject(new Error(`Failed to play Google TTS audio: ${err.message}`));
          });

        // Set a timeout to resolve the promise if audio doesn't end
        setTimeout(() => {
          if (this.isSpeaking) {
            console.log('Google TTS timeout, resolving promise');
            this.isSpeaking = false;
            resolve();
          }
        }, 15000); // 15 second timeout
      } catch (err) {
        console.error('Unexpected error in Google TTS:', err);
        reject(new Error(`Unexpected error in Google TTS: ${err.message}`));
      }
    });
  }

  // Stop any ongoing speech
  stop() {
    // For testing purposes
    if (this.isInTestEnvironment()) {
      console.log('[TEST MODE] Stopping speech');
      this.isSpeaking = false;

      // Dispatch a custom event for testing purposes
      if (typeof document !== 'undefined') {
        const event = new CustomEvent('tts-stop-called');
        document.dispatchEvent(event);
      }

      return;
    }

    // Stop Web Speech API if active
    if (this.webSpeechAvailable) {
      window.speechSynthesis.cancel();
    }

    // Stop audio element if active
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    this.isSpeaking = false;

    // Dispatch a custom event for testing purposes
    if (typeof document !== 'undefined') {
      const event = new CustomEvent('tts-stop-called');
      document.dispatchEvent(event);
    }
  }

  // Check if currently speaking
  isCurrentlySpeaking() {
    return this.isSpeaking;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Set character voices for script reading
  setCharacterVoices(characterVoices) {
    this.characterVoices = characterVoices;
  }

  // Get voice for a character
  getVoiceForCharacter(character) {
    return this.characterVoices[character] || this.defaultVoice;
  }

  // Toggle demo mode
  setDemoMode(isDemo) {
    this.demoMode = isDemo;
    console.log(`TTS Service demo mode ${isDemo ? 'enabled' : 'disabled'}`);
  }

  // Check if in demo mode
  isDemoMode() {
    return this.demoMode;
  }

  // Speak a character's line
  async speakCharacterLine(character, text, options = {}) {
    if (this.demoMode) {
      console.log(`[DEMO MODE] Character ${character} says: "${text.substring(0, 30)}..."`);

      // In demo mode, we'll just simulate speaking with a delay
      this.isSpeaking = true;

      // Dispatch a custom event for demo mode
      if (typeof document !== 'undefined') {
        const event = new CustomEvent('tts-character-speak', {
          detail: { character, text, options }
        });
        document.dispatchEvent(event);
      }

      // Simulate speech duration based on text length
      const duration = Math.min(Math.max(text.length * 50, 500), 3000);
      await new Promise(resolve => setTimeout(resolve, duration));

      this.isSpeaking = false;
      return Promise.resolve();
    }

    // Get the voice for this character
    const voice = this.getVoiceForCharacter(character);

    // Speak the line with the character's voice
    return this.speak(text, {
      ...options,
      voice: voice
    });
  }

  // Get all character voices
  getCharacterVoices() {
    return this.characterVoices;
  }

  // Group voices by language for easier selection
  groupVoicesByLanguage() {
    const groupedVoices = {};

    this.voices.forEach(voice => {
      const lang = voice.lang.split('-')[0]; // Get the primary language code (e.g., 'en' from 'en-US')

      if (!groupedVoices[lang]) {
        groupedVoices[lang] = [];
      }

      groupedVoices[lang].push(voice);
    });

    return groupedVoices;
  }

  // Get preferred voices for different languages
  getPreferredVoices() {
    const groupedVoices = this.groupVoicesByLanguage();
    const preferredVoices = [];

    // Try to get one voice per language
    Object.keys(groupedVoices).forEach(lang => {
      // Prefer non-local voices if available
      const nonLocalVoice = groupedVoices[lang].find(voice => !voice.localService);
      if (nonLocalVoice) {
        preferredVoices.push(nonLocalVoice);
      } else if (groupedVoices[lang].length > 0) {
        // Otherwise use the first available voice
        preferredVoices.push(groupedVoices[lang][0]);
      }
    });

    return preferredVoices;
  }
}

// Export a singleton instance
const ttsService = new TTSService();

// Expose the service to the window object for testing
if (typeof window !== 'undefined') {
  window.ttsService = ttsService;
}

export default ttsService;
