/**
 * Utility functions for speech synthesis
 */

// Get available voices from the browser
export const getAvailableVoices = () => {
  return new Promise((resolve) => {
    console.log('Getting available voices...');

    // Function to get and filter voices
    const getAndFilterVoices = () => {
      // Get the voices that are available
      let voices = window.speechSynthesis.getVoices();
      console.log('Raw voices:', voices);

      // Filter out duplicates and empty voices
      const filteredVoices = voices.filter(voice => voice.name && voice.lang);
      console.log('Filtered voices:', filteredVoices);

      return filteredVoices;
    };

    // Get voices
    let voices = getAndFilterVoices();

    if (voices.length > 0) {
      console.log(`Resolved ${voices.length} voices immediately`);
      resolve(voices);
    } else {
      // Chrome and some other browsers need a callback for voices to load
      console.log('No voices available immediately, waiting for voiceschanged event');

      // Set a timeout in case the event never fires
      const timeoutId = setTimeout(() => {
        console.log('Timeout reached, checking for voices again');
        const fallbackVoices = getAndFilterVoices();
        if (fallbackVoices.length > 0) {
          console.log(`Resolved ${fallbackVoices.length} voices after timeout`);
          resolve(fallbackVoices);
        } else {
          console.warn('No voices available even after timeout');
          resolve([]);
        }
      }, 3000);

      // Listen for the voiceschanged event
      window.speechSynthesis.onvoiceschanged = () => {
        console.log('voiceschanged event fired');
        clearTimeout(timeoutId);
        const eventVoices = getAndFilterVoices();
        console.log(`Resolved ${eventVoices.length} voices from event`);
        resolve(eventVoices);
      };
    }
  });
};

// Group voices by language
export const groupVoicesByLanguage = (voices) => {
  const groupedVoices = {};

  voices.forEach(voice => {
    const lang = voice.lang.split('-')[0]; // Get the primary language code (e.g., 'en' from 'en-US')

    if (!groupedVoices[lang]) {
      groupedVoices[lang] = [];
    }

    groupedVoices[lang].push(voice);
  });

  return groupedVoices;
};

// Speak text with a specific voice - using a more direct approach
export const speakText = (text, voice, rate = 1, pitch = 1, volume = 1) => {
  return new Promise((resolve, reject) => {
    try {
      if (!window.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // If text is empty, resolve immediately
      if (!text || text.trim() === '') {
        console.log('Empty text, skipping speech');
        setTimeout(resolve, 500); // Small delay to simulate speech
        return;
      }

      console.log('Preparing to speak:', text.substring(0, 30) + '...');

      // Force cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);

      // Set properties
      if (voice) {
        console.log('Setting voice:', voice.name);
        utterance.voice = voice;
      } else {
        console.log('Using default voice');
      }

      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Set up a timeout to detect if speech doesn't start
      let speechStarted = false;
      const startTimeout = setTimeout(() => {
        if (!speechStarted) {
          console.warn('Speech did not start within timeout, forcing resolution');
          resolve(); // Force resolve if speech doesn't start
        }
      }, 2000);

      // Set callbacks
      utterance.onstart = () => {
        console.log('Speech started!');
        speechStarted = true;
        clearTimeout(startTimeout);
      };

      utterance.onend = () => {
        console.log('Speech ended');
        clearTimeout(startTimeout);
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Speech error:', error);
        clearTimeout(startTimeout);
        // Don't reject, just resolve to continue with next line
        resolve();
      };

      // Speak the utterance
      console.log('Calling speechSynthesis.speak()...');
      window.speechSynthesis.speak(utterance);

      // Set up a backup timer to resolve the promise if callbacks don't fire
      // Calculate a reasonable duration based on text length and rate
      const wordsCount = text.split(/\s+/).length;
      const estimatedDuration = (wordsCount / 3) * (1 / rate) * 1000; // ~3 words per second at rate=1
      const maxDuration = Math.min(Math.max(estimatedDuration, 1000), 10000); // Between 1-10 seconds

      console.log(`Setting backup timer for ${maxDuration}ms`);
      setTimeout(() => {
        if (!speechStarted) {
          console.warn('Speech never started, forcing resolution');
          resolve();
        } else {
          console.log('Backup timer expired, but speech was started');
        }
      }, maxDuration + 500); // Add 500ms buffer
    } catch (err) {
      console.error('Unexpected error in speakText:', err);
      // Don't reject, just resolve to continue with next line
      resolve();
    }
  });
};

// Cancel all speech
export const cancelSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

// Pause speech
export const pauseSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.pause();
  }
};

// Resume speech
export const resumeSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.resume();
  }
};

// Check if speech synthesis is supported
export const isSpeechSynthesisSupported = () => {
  return 'speechSynthesis' in window;
};

// Assign voices to characters based on available voices
export const assignVoicesToCharacters = (characters, voices) => {
  const characterVoices = {};
  const usedVoices = new Set();

  // Try to assign a unique voice to each character
  characters.forEach((character, index) => {
    // Find a voice that hasn't been used yet
    const availableVoices = voices.filter(voice => !usedVoices.has(voice));

    if (availableVoices.length > 0) {
      // Use the first available voice
      const voice = availableVoices[index % availableVoices.length];
      characterVoices[character] = voice;
      usedVoices.add(voice);
    } else {
      // If all voices have been used, start reusing them
      const voice = voices[index % voices.length];
      characterVoices[character] = voice;
    }
  });

  return characterVoices;
};
