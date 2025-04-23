/**
 * Simple Speech Synthesis - Based on the previously working implementation
 */

class TextToSpeech {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.isInitialized = false;
    this.defaultVoice = null;
    this.defaultRate = 1.0;
    this.defaultPitch = 1.0;
    this.defaultVolume = 1.0;
    this.isSpeaking = false;
    
    // Initialize voices when available
    if (this.synth) {
      this.initVoices();
    }
  }

  // Initialize available voices
  initVoices() {
    // Some browsers need a small delay to load voices
    setTimeout(() => {
      this.voices = this.synth.getVoices();
      
      if (this.voices.length > 0) {
        // Try to find a good default voice
        this.defaultVoice = this.voices.find(voice => 
          voice.lang.includes(navigator.language) && !voice.localService
        );
        
        // Fallback to any voice if no match
        if (!this.defaultVoice) {
          this.defaultVoice = this.voices[0];
        }
        
        this.isInitialized = true;
        console.log('TTS initialized with', this.voices.length, 'voices');
        console.log('Default voice:', this.defaultVoice ? this.defaultVoice.name : 'None');
      }
    }, 100);
  }

  // Speak text with given parameters
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        console.error('Speech synthesis not supported');
        reject(new Error('Speech synthesis not supported in this browser'));
        return;
      }

      // Cancel any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice and parameters
      utterance.voice = options.voice || this.defaultVoice;
      utterance.rate = options.rate || this.defaultRate;
      utterance.pitch = options.pitch || this.defaultPitch;
      utterance.volume = options.volume || this.defaultVolume;
      
      console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'Default');
      
      // Set event handlers
      utterance.onstart = () => {
        console.log('Speech started');
        this.isSpeaking = true;
      };
      
      utterance.onend = () => {
        console.log('Speech ended');
        this.isSpeaking = false;
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        this.isSpeaking = false;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };
      
      // Start speaking
      this.synth.speak(utterance);
      
      // Chrome bug workaround - if speech doesn't start within 1 second, try again
      setTimeout(() => {
        if (!this.isSpeaking) {
          console.log('Speech did not start, trying again...');
          this.synth.cancel();
          this.synth.speak(utterance);
        }
      }, 1000);
      
      // Set a timeout to resolve the promise if speech doesn't end
      setTimeout(() => {
        if (this.isSpeaking) {
          console.log('Speech timeout, resolving promise');
          this.isSpeaking = false;
          resolve();
        }
      }, 10000); // 10 second timeout
    });
  }

  // Stop any ongoing speech
  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  // Get available voices
  getVoices() {
    return this.voices;
  }

  // Check if speech synthesis is supported
  isSupported() {
    return 'speechSynthesis' in window;
  }
}

// Export a singleton instance
const tts = new TextToSpeech();
export default tts;
