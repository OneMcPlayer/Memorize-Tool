/**
 * OpenAI Service
 *
 * This service provides integration with OpenAI's API for text-to-speech and speech-to-text functionality.
 * It requires an API key from the user, which is stored in localStorage.
 * It uses server-side caching for TTS to reduce API calls and costs.
 */

class OpenAIService {
  constructor() {
    this.apiKey = localStorage.getItem('openai_api_key') || '';
    this.baseUrl = 'https://api.openai.com/v1';
    this.serverBaseUrl = '/api'; // Base URL for server endpoints
    this.serverTtsEndpoint = '/tts/speech'; // Server-side TTS endpoint with caching
    this.sttEndpoint = '/audio/transcriptions';
    this.ttsModels = {
      standard: 'tts-1',
      hd: 'tts-1-hd',
      advanced: 'gpt-4o-mini-tts' // Newer model with better quality
    };

    // Load saved TTS model preference or default to HD
    const savedModelKey = localStorage.getItem('openai_tts_model');
    if (savedModelKey && this.ttsModels[savedModelKey]) {
      this.ttsModel = this.ttsModels[savedModelKey];
    } else {
      this.ttsModel = this.ttsModels.hd; // Default to HD model for better quality
    }

    this.sttModel = 'whisper-1';
    this.voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    this.defaultVoice = 'nova';
    this.audioCache = new Map(); // In-memory client-side cache for audio blobs
  }

  /**
   * Set the API key
   * @param {string} apiKey - The OpenAI API key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    localStorage.setItem('openai_api_key', apiKey);
  }

  /**
   * Get the API key
   * @returns {string} The OpenAI API key
   */
  getApiKey() {
    return this.apiKey;
  }

  /**
   * Check if the API key is set
   * @returns {boolean} True if the API key is set, false otherwise
   */
  hasApiKey() {
    return !!this.apiKey;
  }

  /**
   * Get available voices
   * @returns {Array} Array of available voice names
   */
  getVoices() {
    return this.voices;
  }

  /**
   * Get available TTS models
   * @returns {Object} Object containing available TTS models
   */
  getTtsModels() {
    return this.ttsModels;
  }

  /**
   * Set the TTS model to use
   * @param {string} modelKey - The key of the model to use ('standard', 'hd', or 'advanced')
   */
  setTtsModel(modelKey) {
    if (this.ttsModels[modelKey]) {
      this.ttsModel = this.ttsModels[modelKey];
      localStorage.setItem('openai_tts_model', modelKey);
    }
  }

  /**
   * Convert text to speech using OpenAI's API with server-side caching
   * @param {string} text - The text to convert to speech
   * @param {Object} options - Options for the TTS request
   * @returns {Promise<Blob>} A promise that resolves to an audio blob
   */
  async textToSpeech(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not set');
    }

    if (!text || text.trim() === '') {
      throw new Error('Text is required');
    }

    const voice = options.voice || this.defaultVoice;
    const speed = options.speed || 1.0;
    const model = options.model || this.ttsModel;

    // Create a cache key based on the text, voice, speed, and model
    const cacheKey = `${text}_${voice}_${speed}_${model}`;

    // Check if we have this audio in the client-side cache
    if (this.audioCache.has(cacheKey)) {
      console.log('Using client-side cached audio for:', text.substring(0, 30) + '...');
      return this.audioCache.get(cacheKey);
    }

    try {
      // Use the server-side TTS endpoint with caching
      const response = await fetch(`${this.serverBaseUrl}${this.serverTtsEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voice: voice,
          speed: speed,
          model: model,
          apiKey: this.apiKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`TTS error: ${error.error || response.statusText}`);
      }

      const audioBlob = await response.blob();

      // Cache the audio blob on the client side
      this.audioCache.set(cacheKey, audioBlob);

      return audioBlob;
    } catch (error) {
      console.error('Error in textToSpeech:', error);
      throw error;
    }
  }

  /**
   * Convert speech to text using OpenAI's API
   * @param {Blob} audioBlob - The audio blob to convert to text
   * @returns {Promise<string>} A promise that resolves to the transcribed text
   */
  async speechToText(audioBlob) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not set');
    }

    if (!audioBlob) {
      throw new Error('Audio data is required');
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', this.sttModel);
      formData.append('language', 'en'); // Default to English, can be made configurable

      const response = await fetch(`${this.baseUrl}${this.sttEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const result = await response.json();
      return result.text;
    } catch (error) {
      console.error('Error in speechToText:', error);
      throw error;
    }
  }

  /**
   * Play audio from a blob
   * @param {Blob} audioBlob - The audio blob to play
   * @returns {Promise<void>} A promise that resolves when the audio finishes playing
   */
  playAudio(audioBlob) {
    return new Promise((resolve, reject) => {
      try {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };

        audio.play().catch(error => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear the audio cache
   */
  clearCache() {
    this.audioCache.clear();
  }
}

// Create a singleton instance
const openaiService = new OpenAIService();

export default openaiService;
