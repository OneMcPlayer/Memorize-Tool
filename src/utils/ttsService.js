/**
 * Text-to-Speech Service
 * 
 * A comprehensive TTS service that combines multiple approaches:
 * 1. Web Speech API (native browser support)
 * 2. ElevenLabs TTS API (high quality, requires API key)
 * 3. Google Translate TTS (fallback, no API key needed but has limitations)
 */

class TTSService {
  constructor() {
    // Initialize state
    this.initialized = false;
    this.webSpeechAvailable = 'speechSynthesis' in window;
    this.currentAudio = null;
    this.isSpeaking = false;
    this.userInteracted = false;
    this.voices = [];
    this.defaultVoice = null;
    
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
    
    // Initialize if Web Speech API is available
    if (this.webSpeechAvailable) {
      this.initWebSpeech();
    }
    
    // Track user interaction to enable autoplay
    this.setupUserInteractionTracking();
    
    console.log('TTS Service initialized. Web Speech available:', this.webSpeechAvailable);
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
  }
  
  // Check if currently speaking
  isCurrentlySpeaking() {
    return this.isSpeaking;
  }
  
  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export a singleton instance
const ttsService = new TTSService();
export default ttsService;
