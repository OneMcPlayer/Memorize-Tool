/**
 * Jest tests for the basicAudioPlayer utility
 */

// Mock the Audio constructor
global.Audio = class {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.oncanplaythrough = null;
    this.onplay = null;
    this.onended = null;
    this.onerror = null;
    
    // Simulate the audio events
    setTimeout(() => {
      if (this.oncanplaythrough) this.oncanplaythrough();
    }, 10);
  }
  
  play() {
    return new Promise((resolve) => {
      if (this.onplay) this.onplay();
      
      // Simulate audio playback
      setTimeout(() => {
        if (this.onended) this.onended();
        resolve();
      }, 50);
    });
  }
  
  pause() {
    // Mock implementation
  }
};

// Import the module under test
import audioPlayer from './basicAudioPlayer';

describe('Basic Audio Player', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Spy on console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  
  it('should create an instance of the audio player', () => {
    expect(audioPlayer).toBeDefined();
    expect(audioPlayer.isSupported()).toBe(true);
  });
  
  it('should play text using Google Translate TTS API', async () => {
    // Spy on Audio constructor
    const audioSpy = jest.spyOn(global, 'Audio');
    
    // Call the method under test
    const result = audioPlayer.playText('This is a test', {
      voice: { lang: 'en-US' },
      volume: 0.5
    });
    
    // Verify Audio was created with the correct URL
    expect(audioSpy).toHaveBeenCalled();
    const audioInstance = audioSpy.mock.instances[0];
    
    // Verify the audio properties were set correctly
    expect(audioInstance.volume).toBe(0.5);
    
    // Wait for the promise to resolve
    await result;
    
    // Verify console output
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Audio playback started'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Audio playback ended'));
  });
  
  it('should handle empty text', async () => {
    // Call the method under test with empty text
    const result = await audioPlayer.playText('', {
      voice: { lang: 'en-US' },
      volume: 0.5
    });
    
    // Verify no Audio was created
    expect(global.Audio).not.toHaveBeenCalled();
    
    // Verify console output
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Empty text, skipping speech'));
  });
  
  it('should handle errors during playback', async () => {
    // Mock Audio to throw an error
    global.Audio = class {
      constructor() {
        this.onerror = null;
        
        // Simulate an error
        setTimeout(() => {
          if (this.onerror) this.onerror(new Error('Audio playback error'));
        }, 10);
      }
      
      play() {
        return Promise.reject(new Error('Audio playback error'));
      }
    };
    
    // Call the method under test
    const result = await audioPlayer.playText('This is a test', {
      voice: { lang: 'en-US' },
      volume: 0.5
    });
    
    // Verify console output
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Audio play() promise rejected:'), expect.any(Error));
  });
  
  it('should use the correct language code from the voice', async () => {
    // Spy on Audio constructor
    const audioSpy = jest.spyOn(global, 'Audio');
    
    // Call the method under test with different languages
    await audioPlayer.playText('This is a test', {
      voice: { lang: 'it-IT' },
      volume: 0.5
    });
    
    // Verify the URL contains the correct language code
    const url = audioSpy.mock.calls[0][0];
    expect(url).toContain('tl=it');
    
    // Call with a different language
    await audioPlayer.playText('This is a test', {
      voice: { lang: 'fr-FR' },
      volume: 0.5
    });
    
    // Verify the URL contains the correct language code
    const url2 = audioSpy.mock.calls[1][0];
    expect(url2).toContain('tl=fr');
  });
  
  it('should limit text to 200 characters', async () => {
    // Spy on Audio constructor
    const audioSpy = jest.spyOn(global, 'Audio');
    
    // Create a long text
    const longText = 'A'.repeat(250);
    
    // Call the method under test
    await audioPlayer.playText(longText, {
      voice: { lang: 'en-US' },
      volume: 0.5
    });
    
    // Verify the URL contains the truncated text
    const url = audioSpy.mock.calls[0][0];
    const decodedText = decodeURIComponent(url.split('q=')[1].split('&')[0]);
    
    // Should be 200 characters or less
    expect(decodedText.length).toBeLessThanOrEqual(200);
    expect(decodedText).toContain('...');
  });
});
