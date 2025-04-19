/**
 * Utility functions for speech synthesis
 */

// Get available voices from the browser
export const getAvailableVoices = () => {
  return new Promise((resolve) => {
    // Get the voices that are available
    let voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      resolve(voices);
    } else {
      // Chrome needs a callback for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
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

// Speak text with a specific voice
export const speakText = (text, voice, rate = 1, pitch = 1, volume = 1) => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set properties
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    // Set callbacks
    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);
    
    // Speak the utterance
    window.speechSynthesis.speak(utterance);
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
