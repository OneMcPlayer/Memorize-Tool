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
    // Create a test phrase and encode it
    const testPhrase = 'This is a test of the Google Translate text to speech API';
    const encodedText = encodeURIComponent(testPhrase);
    
    // Create the URL for Google Translate TTS
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&client=tw-ob`;
    
    console.log('Google TTS URL created:', audioUrl);
    
    // Create an audio element with the TTS URL
    const audio = new Audio(audioUrl);
    
    console.log('TTS Audio element created');
    
    // Set up event listeners
    audio.oncanplaythrough = () => {
      console.log('TTS Audio can play through');
    };
    
    audio.onplay = () => {
      console.log('TTS Audio playback started');
    };
    
    audio.onended = () => {
      console.log('TTS Audio playback ended');
    };
    
    audio.onerror = (err) => {
      console.error('TTS Audio error:', err);
    };
    
    // Try to play the audio
    try {
      console.log('Attempting to play TTS audio...');
      await audio.play();
      console.log('TTS Audio play() promise resolved');
    } catch (err) {
      console.error('TTS Audio play() promise rejected:', err);
      return {
        success: false,
        error: err.message,
        errorType: 'play_rejected',
        details: 'The browser rejected the play() request for Google TTS. This could be due to CORS issues or autoplay policies.'
      };
    }
    
    return {
      success: true,
      message: 'Google TTS test completed successfully'
    };
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

// Test alternative TTS service (ResponsiveVoice API)
export const testAlternativeTTS = async () => {
  console.log('=== Testing Alternative TTS API ===');
  
  try {
    // Create a test phrase
    const testPhrase = 'This is a test of an alternative text to speech API';
    
    // Create an audio element with a different TTS service
    // Using a free TTS service that doesn't require API keys
    const audioUrl = `https://api.voicerss.org/?key=00000000000000000000000000000000&hl=en-us&src=${encodeURIComponent(testPhrase)}`;
    
    console.log('Alternative TTS URL created');
    
    // Create an audio element with the TTS URL
    const audio = new Audio(audioUrl);
    
    console.log('Alternative TTS Audio element created');
    
    // Set up event listeners
    audio.oncanplaythrough = () => {
      console.log('Alternative TTS Audio can play through');
    };
    
    audio.onplay = () => {
      console.log('Alternative TTS Audio playback started');
    };
    
    audio.onended = () => {
      console.log('Alternative TTS Audio playback ended');
    };
    
    audio.onerror = (err) => {
      console.error('Alternative TTS Audio error:', err);
    };
    
    // Try to play the audio
    try {
      console.log('Attempting to play alternative TTS audio...');
      await audio.play();
      console.log('Alternative TTS Audio play() promise resolved');
    } catch (err) {
      console.error('Alternative TTS Audio play() promise rejected:', err);
      return {
        success: false,
        error: err.message,
        errorType: 'play_rejected',
        details: 'The browser rejected the play() request for the alternative TTS. This could be due to CORS issues or autoplay policies.'
      };
    }
    
    return {
      success: true,
      message: 'Alternative TTS test completed successfully'
    };
  } catch (err) {
    console.error('Error in alternative TTS test:', err);
    return {
      success: false,
      error: err.message,
      errorType: 'general_error',
      details: 'An unexpected error occurred during the alternative TTS test.'
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
