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

// Simple audio-based text-to-speech using Google Translate TTS API
export const speakText = (text, voice, rate = 1, pitch = 1, volume = 1) => {
  return new Promise((resolve) => {
    try {
      // If text is empty, resolve immediately
      if (!text || text.trim() === '') {
        console.log('Empty text, skipping speech');
        setTimeout(resolve, 500); // Small delay to simulate speech
        return;
      }

      console.log('Using audio-based TTS for:', text.substring(0, 30) + '...');

      // Prepare the text - limit to 200 characters (Google Translate TTS API limit)
      const trimmedText = text.length > 200 ? text.substring(0, 197) + '...' : text;
      const encodedText = encodeURIComponent(trimmedText);

      // Get language code based on voice preference, default to English
      let langCode = 'en';
      if (voice && voice.lang) {
        // Extract primary language code (e.g., 'it' from 'it-IT')
        langCode = voice.lang.split('-')[0];
      }

      // Create audio URL using Google Translate TTS API
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${langCode}&client=tw-ob`;

      console.log(`Creating audio with language: ${langCode}`);

      // Create and play audio
      const audio = new Audio(audioUrl);

      // Apply volume setting
      audio.volume = volume;

      // Set up event handlers
      audio.onplay = () => {
        console.log('Audio playback started');
      };

      audio.onended = () => {
        console.log('Audio playback ended');
        resolve();
      };

      audio.onerror = (err) => {
        console.error('Audio playback error:', err);
        resolve(); // Resolve anyway to continue with next line
      };

      // Set a timeout in case the audio doesn't play or end event doesn't fire
      const timeout = setTimeout(() => {
        console.warn('Audio playback timeout - continuing');
        resolve();
      }, 7000); // Generous timeout

      // Start playback when ready
      audio.oncanplaythrough = () => {
        console.log('Audio ready to play');
        audio.play()
          .then(() => {
            console.log('Audio play() promise resolved');
          })
          .catch(err => {
            console.error('Audio play() promise rejected:', err);
            clearTimeout(timeout);
            resolve(); // Continue with next line
          });
      };

      // Set another timeout in case oncanplaythrough never fires
      setTimeout(() => {
        if (!audio.paused) {
          console.log('Audio is already playing');
          return;
        }

        console.log('Forcing audio play attempt');
        audio.play().catch(err => {
          console.error('Forced audio play failed:', err);
          clearTimeout(timeout);
          resolve();
        });
      }, 2000);

    } catch (err) {
      console.error('Unexpected error in speakText:', err);
      resolve(); // Continue with next line
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
