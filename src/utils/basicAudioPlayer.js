/**
 * Basic Audio Player - A very simple approach to playing audio for script lines
 */

class BasicAudioPlayer {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.queue = [];
    this.currentPromiseResolve = null;
  }

  // Play a text using a basic TTS API
  playText(text, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Clean up any previous audio
        this.stop();
        
        // Create a new audio element
        this.audio = new Audio();
        
        // Set volume
        this.audio.volume = options.volume || 1.0;
        
        // Get language code based on voice preference, default to English
        let langCode = 'en';
        if (options.voice && options.voice.lang) {
          // Extract primary language code (e.g., 'it' from 'it-IT')
          langCode = options.voice.lang.split('-')[0];
        }
        
        // Prepare the text - limit to 200 characters (Google Translate TTS API limit)
        const trimmedText = text.length > 200 ? text.substring(0, 197) + '...' : text;
        const encodedText = encodeURIComponent(trimmedText);
        
        // Create audio URL using Google Translate TTS API
        this.audio.src = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${langCode}&client=tw-ob`;
        
        console.log(`Playing audio for text: "${text.substring(0, 30)}..." in language: ${langCode}`);
        
        // Set up event handlers
        this.audio.onplay = () => {
          console.log('Audio playback started');
          this.isPlaying = true;
        };
        
        this.audio.onended = () => {
          console.log('Audio playback ended');
          this.isPlaying = false;
          resolve();
        };
        
        this.audio.onerror = (err) => {
          console.error('Audio playback error:', err);
          this.isPlaying = false;
          resolve(); // Resolve anyway to continue with next line
        };
        
        // Set a timeout in case the audio doesn't play or end event doesn't fire
        const timeout = setTimeout(() => {
          console.warn('Audio playback timeout - continuing');
          this.isPlaying = false;
          resolve();
        }, 7000); // Generous timeout
        
        // Play the audio
        this.audio.play()
          .then(() => {
            clearTimeout(timeout);
            // The onended event will resolve the promise
          })
          .catch(err => {
            console.error('Audio play() promise rejected:', err);
            clearTimeout(timeout);
            this.isPlaying = false;
            resolve(); // Continue with next line
          });
          
      } catch (err) {
        console.error('Unexpected error in playText:', err);
        this.isPlaying = false;
        resolve(); // Continue with next line
      }
    });
  }

  // Stop any ongoing audio
  stop() {
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch (err) {
        console.error('Error stopping audio:', err);
      }
      this.isPlaying = false;
    }
  }

  // Check if audio is supported
  isSupported() {
    return typeof Audio !== 'undefined';
  }
}

// Export a singleton instance
const audioPlayer = new BasicAudioPlayer();
export default audioPlayer;
