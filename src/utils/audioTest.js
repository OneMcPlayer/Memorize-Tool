/**
 * Audio Test Utility
 * This file contains functions to test audio playback in different ways
 */

// Test direct Audio element creation and playback
export const testDirectAudio = async () => {
  console.log('=== Testing Direct Audio Playback ===');

  try {
    // Create a simple audio element with a test sound
    const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-1.mp3');

    console.log('Audio element created');

    // Set up event listeners
    audio.oncanplaythrough = () => {
      console.log('Audio can play through');
    };

    audio.onplay = () => {
      console.log('Audio playback started');
    };

    audio.onended = () => {
      console.log('Audio playback ended');
    };

    audio.onerror = (err) => {
      console.error('Audio error:', err);
    };

    // Try to play the audio
    try {
      console.log('Attempting to play audio...');
      await audio.play();
      console.log('Audio play() promise resolved');
    } catch (err) {
      console.error('Audio play() promise rejected:', err);
      return {
        success: false,
        error: err.message,
        errorType: 'play_rejected',
        details: 'The browser rejected the play() request. This often happens due to autoplay policies.'
      };
    }

    return {
      success: true,
      message: 'Direct audio playback test completed successfully'
    };
  } catch (err) {
    console.error('Error in direct audio test:', err);
    return {
      success: false,
      error: err.message,
      errorType: 'general_error',
      details: 'An unexpected error occurred during the direct audio test.'
    };
  }
};

// Test Google Translate TTS API
export const testGoogleTTS = async () => {
  console.log('=== Testing Google Translate TTS API ===');

  try {
    // Import the TTS service
    const ttsService = (await import('./ttsService')).default;

    // Create a test phrase
    const testPhrase = 'This is a test of the Google Translate text to speech API';

    console.log('Testing TTS service with Google TTS...');

    // Try to speak the text
    try {
      // Configure to use Google TTS
      ttsService.updateConfig({
        useWebSpeech: false,
        useGoogleTTS: true,
        useProxy: false
      });

      console.log('Attempting to speak with Google TTS...');
      await ttsService.speak(testPhrase, { lang: 'en-US' });
      console.log('Google TTS speak() promise resolved');

      return {
        success: true,
        message: 'Google TTS test completed successfully'
      };
    } catch (err) {
      console.error('Google TTS speak() promise rejected:', err);
      return {
        success: false,
        error: err.message,
        errorType: 'play_rejected',
        details: 'The TTS service failed to play audio with Google TTS. This could be due to CORS issues or autoplay policies.'
      };
    }
  } catch (err) {
    console.error('Error in Google TTS test:', err);
    return {
      success: false,
      error: err.message,
      errorType: 'general_error',
      details: 'An unexpected error occurred during the Google TTS test.'
    };
  }
};

// Test Web Speech API
export const testAlternativeTTS = async () => {
  console.log('=== Testing Web Speech API ===');

  try {
    // Check if Web Speech API is available
    if (!('speechSynthesis' in window)) {
      return {
        success: false,
        error: 'Web Speech API not available',
        errorType: 'not_supported',
        details: 'This browser does not support the Web Speech API.'
      };
    }

    // Import the TTS service
    const ttsService = (await import('./ttsService')).default;

    // Create a test phrase
    const testPhrase = 'This is a test of the Web Speech API';

    console.log('Testing TTS service with Web Speech API...');

    // Try to speak the text
    try {
      // Configure to use Web Speech API only
      ttsService.updateConfig({
        useWebSpeech: true,
        useGoogleTTS: false
      });

      console.log('Attempting to speak with Web Speech API...');
      await ttsService.speak(testPhrase, { lang: 'en-US' });
      console.log('Web Speech API speak() promise resolved');

      return {
        success: true,
        message: 'Web Speech API test completed successfully'
      };
    } catch (err) {
      console.error('Web Speech API speak() promise rejected:', err);
      return {
        success: false,
        error: err.message,
        errorType: 'speech_error',
        details: 'The Web Speech API failed to play audio. This could be due to browser limitations or autoplay policies.'
      };
    }
  } catch (err) {
    console.error('Error in Web Speech API test:', err);
    return {
      success: false,
      error: err.message,
      errorType: 'general_error',
      details: 'An unexpected error occurred during the Web Speech API test.'
    };
  }
};

// Run all tests
export const runAllTests = async () => {
  const results = {
    directAudio: await testDirectAudio(),
    googleTTS: await testGoogleTTS(),
    alternativeTTS: await testAlternativeTTS()
  };

  console.log('=== All Test Results ===', results);
  return results;
};
