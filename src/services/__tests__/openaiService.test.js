import openaiService from '../openaiService';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    headers: {
      get: jest.fn(() => null)
    },
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob(['test audio data'], { type: 'audio/mpeg' })),
    json: () => Promise.resolve({})
  })
);

describe('OpenAI Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    openaiService.setApiKey('');
    openaiService.audioCache.clear();
    openaiService.requestTimestamps = [];
    openaiService.rateLimitQueue = [];
    openaiService.isProcessingQueue = false;
    openaiService.setRequestsPerMinute(100);
    openaiService.isTestMode = false;
    global.fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: {
          get: jest.fn(() => null)
        },
        text: () => Promise.resolve(''),
        blob: () => Promise.resolve(new Blob(['test audio data'], { type: 'audio/mpeg' })),
        json: () => Promise.resolve({})
      })
    );
  });

  describe('API Key Management', () => {
    it('should set and get API key', () => {
      const testKey = 'test-api-key-123';
      openaiService.setApiKey(testKey);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('openai_api_key', testKey);
      expect(openaiService.getApiKey()).toBe(testKey);
    });

    it('should check if API key is set', () => {
      // First clear the API key
      openaiService.setApiKey('');
      expect(openaiService.hasApiKey()).toBe(false);

      openaiService.setApiKey('test-key');
      expect(openaiService.hasApiKey()).toBe(true);
    });
  });

  describe('TTS Model Management', () => {
    it('should get available TTS models', () => {
      const models = openaiService.getTtsModels();

      expect(models).toHaveProperty('standard');
      expect(models).toHaveProperty('hd');
      expect(models).toHaveProperty('advanced');
    });

    it('should set TTS model', () => {
      const initialModel = openaiService.ttsModel;

      openaiService.setTtsModel('standard');
      expect(openaiService.ttsModel).toBe(openaiService.ttsModels.standard);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('openai_tts_model', 'standard');

      // Invalid model key should not change the model
      const currentModel = openaiService.ttsModel;
      openaiService.setTtsModel('invalid-model');
      expect(openaiService.ttsModel).toBe(currentModel);
    });
  });

  describe('Text-to-Speech', () => {
    it('should throw error if API key is not set', async () => {
      await expect(openaiService.textToSpeech('Hello')).rejects.toThrow('OpenAI API key is not set');
    });

    it('should throw error if text is empty', async () => {
      openaiService.setApiKey('test-key');
      await expect(openaiService.textToSpeech('')).rejects.toThrow('Text is required');
    });

    it('should call server-side TTS endpoint with correct parameters', async () => {
      // Setup
      const testKey = 'test-key';
      const testText = 'Hello, world!';
      const testVoice = 'coral';
      const testSpeed = 1.0;

      openaiService.setApiKey(testKey);

      // Save the original model and set it to a known value for testing
      const originalModel = openaiService.ttsModel;
      openaiService.ttsModel = 'tts-1-hd';

      // Reset fetch mock
      global.fetch.mockClear();

      // Call the method
      await openaiService.textToSpeech(testText, {
        voice: testVoice,
        speed: testSpeed
      });

      // Assertions
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tts/speech',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.any(String)
        })
      );

      // Parse the body to check its contents
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body).toEqual({
        text: testText,
        voice: testVoice,
        speed: testSpeed,
        model: 'tts-1-hd',
        apiKey: testKey
      });

      // Restore the original model
      openaiService.ttsModel = originalModel;
    });

    it('should use client-side cache when available', async () => {
      // Setup
      openaiService.setApiKey('test-key');
      const testText = 'Hello, world!';
      const testVoice = 'coral';
      const testSpeed = 1.0;
      const testModel = openaiService.ttsModel;
      const cacheKey = `${testText}_${testVoice}_${testSpeed}_${testModel}`;
      const mockBlob = new Blob(['test audio data'], { type: 'audio/mpeg' });

      // Clear the cache first
      openaiService.audioCache.clear();

      // Add to cache
      openaiService.audioCache.set(cacheKey, mockBlob);

      // Reset fetch mock
      global.fetch.mockClear();

      // Call the method
      const result = await openaiService.textToSpeech(testText, {
        voice: testVoice,
        speed: testSpeed
      });

      // Assertions
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual(mockBlob); // Use toEqual instead of toBe for Blob comparison
    });

    it('should handle API errors', async () => {
      // Setup
      openaiService.setApiKey('test-key');

      // Mock error response
      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          headers: {
            get: jest.fn(() => null)
          },
          text: () => Promise.resolve('Invalid API key'),
          json: () => Promise.resolve({ error: 'Invalid API key' }),
          statusText: 'Unauthorized'
        })
      );

      // Call the method and expect it to throw
      await expect(openaiService.textToSpeech('Hello')).rejects.toThrow('TTS error: Invalid API key');
    });
  });

  describe('Audio Playback', () => {
    it('should play audio from blob', async () => {
      // Mock Audio
      const mockAudio = {
        play: jest.fn().mockResolvedValueOnce(undefined),
        onended: null,
        onerror: null
      };
      global.Audio = jest.fn().mockImplementationOnce(() => mockAudio);
      global.URL.createObjectURL = jest.fn().mockReturnValueOnce('blob:test-url');
      global.URL.revokeObjectURL = jest.fn();

      const mockBlob = new Blob(['test audio data'], { type: 'audio/mpeg' });

      // Call the method
      const playPromise = openaiService.playAudio(mockBlob);

      // Simulate audio ended
      mockAudio.onended();

      // Wait for the promise to resolve
      await playPromise;

      // Assertions
      expect(global.Audio).toHaveBeenCalledWith('blob:test-url');
      expect(mockAudio.play).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('should handle audio play errors', async () => {
      // Mock Audio
      const mockAudio = {
        play: jest.fn().mockRejectedValueOnce(new Error('Audio play error')),
        onended: null,
        onerror: null
      };
      global.Audio = jest.fn().mockImplementationOnce(() => mockAudio);
      global.URL.createObjectURL = jest.fn().mockReturnValueOnce('blob:test-url');
      global.URL.revokeObjectURL = jest.fn();

      const mockBlob = new Blob(['test audio data'], { type: 'audio/mpeg' });

      // Call the method and expect it to throw
      await expect(openaiService.playAudio(mockBlob)).rejects.toThrow('Audio play error');

      // Assertions
      expect(global.Audio).toHaveBeenCalledWith('blob:test-url');
      expect(mockAudio.play).toHaveBeenCalled();
    });
  });

  describe('Speech-to-Text', () => {
    it('calls the OpenAI transcription endpoint without forcing English', async () => {
      openaiService.setApiKey('test-key');
      global.fetch.mockClear();

      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          headers: {
            get: jest.fn(() => null)
          },
          json: () => Promise.resolve({ text: 'ciao mondo' })
        })
      );

      const result = await openaiService.speechToText(
        new Blob(['test audio data'], { type: 'audio/webm;codecs=opus' })
      );

      expect(result).toBe('ciao mondo');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-key'
          },
          body: expect.any(FormData)
        })
      );

      const formData = global.fetch.mock.calls[0][1].body;
      expect(formData.get('model')).toBe(openaiService.sttModel);
      expect(formData.get('language')).toBeNull();
      expect(formData.get('file')).toBeInstanceOf(File);
      expect(formData.get('file').name).toBe('recording.webm');
    });

    it('passes through an explicit language when provided', async () => {
      openaiService.setApiKey('test-key');
      global.fetch.mockClear();

      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          headers: {
            get: jest.fn(() => null)
          },
          json: () => Promise.resolve({ text: 'hello world' })
        })
      );

      await openaiService.speechToText(
        new Blob(['test audio data'], { type: 'audio/mp4' }),
        { language: 'en' }
      );

      const formData = global.fetch.mock.calls[0][1].body;
      expect(formData.get('language')).toBe('en');
      expect(formData.get('file').name).toBe('recording.mp4');
    });
  });
});
