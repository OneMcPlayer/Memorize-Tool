/**
 * Basic Audio Player - A wrapper around the TTS service for script lines
 */

import ttsService from './ttsService';

class BasicAudioPlayer {
  constructor() {
    this.isPlaying = false;
    this.userInteracted = false;

    // Track user interaction to enable autoplay
    this.setupUserInteractionTracking();
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

      console.log('User interaction detected in BasicAudioPlayer');
    };

    // Add event listeners for user interaction
    interactionEvents.forEach(event => {
      document.addEventListener(event, handleUserInteraction);
    });
  }

  // Play a text using the TTS service
  playText(text, options = {}) {
    return new Promise((resolve) => {
      try {
        // If text is empty, resolve immediately
        if (!text || text.trim() === '') {
          console.log('Empty text, skipping speech');
          setTimeout(resolve, 500); // Small delay to simulate speech
          return;
        }

        // Clean up any previous audio
        this.stop();

        // Check if user has interacted with the page
        if (!this.userInteracted) {
          console.warn('User has not interacted with the page yet, audio may be blocked');
        }

        console.log(`Playing audio for text: "${text.substring(0, 30)}..." with voice:`,
          options.voice ? options.voice.name || options.voice.lang : 'default');

        // Use the TTS service to speak the text
        this.isPlaying = true;

        ttsService.speak(text, options)
          .then(() => {
            console.log('TTS playback completed');
            this.isPlaying = false;
            resolve();
          })
          .catch(err => {
            console.error('TTS playback error:', err);
            this.isPlaying = false;
            resolve(); // Resolve anyway to continue with next line
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
    if (this.isPlaying) {
      try {
        ttsService.stop();
      } catch (err) {
        console.error('Error stopping audio:', err);
      }
      this.isPlaying = false;
    }
  }

  // Check if audio is supported
  isSupported() {
    return ttsService.isAvailable();
  }
}

// Export a singleton instance
const audioPlayer = new BasicAudioPlayer();
export default audioPlayer;
