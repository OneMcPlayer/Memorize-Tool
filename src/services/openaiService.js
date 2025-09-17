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
    this.serverBaseUrl = 'http://localhost:5000/api'; // Direct URL to server endpoints
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
    this.voices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse'];
    this.defaultVoice = 'coral';
    this.audioCache = new Map(); // In-memory client-side cache for audio blobs
    this.apiCallCount = 0; // Counter for API calls in current session
    this.debugMode = localStorage.getItem('openai_debug_mode') === 'true' || false; // Debug mode flag
    this.isTestMode = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test'; // Test mode detection

    // Rate limiting settings
    this.rateLimitQueue = []; // Queue for rate-limited requests
    this.isProcessingQueue = false; // Flag to track if we're processing the queue
    this.requestsPerMinute = 3; // Default OpenAI free tier limit
    this.requestTimestamps = []; // Timestamps of recent requests

    // Only log initialization in debug mode
    if (this.debugMode) {
      console.log('OpenAI Service initialized. Test mode:', this.isTestMode);
    }
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
      console.log('%c CLIENT CACHE HIT: Using client-side cached audio for:', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', text.substring(0, 30) + '...');
      return this.audioCache.get(cacheKey);
    }

    console.log('%c CLIENT CACHE MISS: Not found in client-side cache:', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', text.substring(0, 30) + '...');

    // Create a function that will make the actual request
    const makeRequest = async () => {
      // Log request details in debug mode
      if (this.debugMode) {
        console.log('TTS Request:', {
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          voice,
          speed,
          model,
          endpoint: `${this.serverBaseUrl}${this.serverTtsEndpoint}`
        });
      }

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
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;

          // Check if this is a rate limit error
          if (errorMessage.includes('Rate limit reached')) {
            console.log('Rate limit error detected, will be handled by queue');
            throw new Error(`RATE_LIMIT_ERROR: ${errorMessage}`);
          }
        } catch (jsonError) {
          if (jsonError.message && jsonError.message.includes('RATE_LIMIT_ERROR')) {
            throw jsonError; // Re-throw rate limit errors
          }

          // If the response is not valid JSON, use the text content
          try {
            errorMessage = await response.text();
          } catch (textError) {
            // If we can't get the text either, use the status text
            errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(`TTS error: ${errorMessage}`);
      }

      // Get cache status headers
      const cacheStatus = response.headers.get('X-TTS-Cache-Status');
      const cacheSource = response.headers.get('X-TTS-Cache-Source');
      const cacheKey = response.headers.get('X-TTS-Cache-Key');

      // Log detailed cache information
      console.log('Cache info:', {
        status: cacheStatus,
        source: cacheSource,
        key: cacheKey,
        text: text.substring(0, 30) + (text.length > 30 ? '...' : '')
      });

      // Only increment the API call counter if this was an actual OpenAI API call
      if (cacheStatus === 'MISS' && cacheSource === 'OPENAI') {
        this.apiCallCount++;
        console.log('%c INCREMENTING API CALL COUNT - Actual OpenAI API call made', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;');
      } else {
        console.log('%c NOT incrementing API call count - Using cached audio', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
      }

      // Check if this was a server cache hit
      if (cacheStatus === 'HIT') {
        // For cache hits, show a different toast
        import('../utils').then(utils => {
          utils.showToast(
            `Using cached audio: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`,
            2000,
            'info'
          );
        });
        console.log(`Using cached audio from server for: ${text.substring(0, 30)}...`);
      } else {
        // For actual API calls, show the API call toast
        // Check for debug header and display notification if present
        const debugHeader = response.headers.get('X-OpenAI-TTS-Debug');
        if (debugHeader) {
          try {
            const debugInfo = JSON.parse(debugHeader);
            if (debugInfo.type === 'api_call') {
              // Import dynamically to avoid circular dependencies
              import('../utils').then(utils => {
                utils.showToast(
                  `OpenAI API Call #${this.apiCallCount}: ${debugInfo.model} (${debugInfo.voice}) - ${debugInfo.textLength} chars`,
                  3000,
                  'warning'
                );
              });
              console.log(`OpenAI TTS API Call #${this.apiCallCount}:`, debugInfo);
            }
          } catch (e) {
            console.error('Error parsing debug header:', e);

            // Still show a toast even if we can't parse the debug header
            import('../utils').then(utils => {
              utils.showToast(
                `OpenAI API Call #${this.apiCallCount}: TTS request made`,
                3000,
                'warning'
              );
            });
          }
        } else {
          // No debug header, but still show a toast
          import('../utils').then(utils => {
            utils.showToast(
              `OpenAI API Call #${this.apiCallCount}: TTS request made`,
              3000,
              'warning'
            );
          });
          console.log(`OpenAI TTS API Call #${this.apiCallCount}`);
        }
      }

      const audioBlob = await response.blob();

      // Cache the audio blob on the client side
      this.audioCache.set(cacheKey, audioBlob);
      console.log('%c CLIENT CACHE STORE: Saved to client-side cache:', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', text.substring(0, 30) + '...', 'Cache size:', this.audioCache.size);

      return audioBlob;
    };

    try {
      // Add the request to the rate limit queue
      return await this.addToRateLimitQueue(makeRequest);
    } catch (error) {
      console.error('Error in textToSpeech:', error);

      // If this is a rate limit error, show a specific message
      if (error.message && error.message.includes('RATE_LIMIT_ERROR')) {
        import('../utils').then(utils => {
          utils.showToast(
            'Rate limit reached. Your request has been queued and will be processed automatically.',
            5000,
            'warning'
          );
        });

        // Wait for 20 seconds (OpenAI's suggested retry time) and try again
        await new Promise(resolve => setTimeout(resolve, 20000));
        return await this.addToRateLimitQueue(makeRequest);
      }

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

    // Create a function that will make the actual request
    const makeRequest = async () => {
      try {
        // Avoid hitting the API during automated tests
        if (this.isTestMode) {
          return 'Test transcription';
        }

        const formData = new FormData();

        // Determine the correct file extension based on the blob type
        let fileExtension = 'webm';
        if (audioBlob.type.includes('mp4')) {
          fileExtension = 'mp4';
        } else if (audioBlob.type.includes('ogg')) {
          fileExtension = 'ogg';
        }

        formData.append('file', audioBlob, `recording.${fileExtension}`);
        formData.append('model', this.sttModel);
        formData.append('language', 'en'); // Default to English, can be made configurable

        // Log STT API call for debugging
        console.log('%c Making OpenAI Speech-to-Text API call...', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', {
          model: this.sttModel,
          audioSize: `${Math.round(audioBlob.size / 1024)} KB`,
          fileType: audioBlob.type,
          fileExtension: fileExtension
        });

        this.apiCallCount++;

        // Show toast notification for STT API call
        import('../utils').then(utils => {
          utils.showToast(
            `OpenAI STT API Call #${this.apiCallCount}: ${this.sttModel} - Audio length: ${Math.round(audioBlob.size / 1024)} KB`,
            3000,
            'warning'
          );
        });

        // Set a timeout for the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          const response = await fetch(`${this.baseUrl}${this.sttEndpoint}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: formData,
            signal: controller.signal
          });

          clearTimeout(timeoutId); // Clear the timeout if the request completes

          if (!response.ok) {
            let errorMessage;
            try {
              const error = await response.json();
              errorMessage = error.error?.message || response.statusText;

              // Check if this is a rate limit error
              if (errorMessage.includes('Rate limit reached')) {
                throw new Error(`RATE_LIMIT_ERROR: ${errorMessage}`);
              }
            } catch (e) {
              if (e.message && e.message.includes('RATE_LIMIT_ERROR')) {
                throw e; // Re-throw rate limit errors
              }
              errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
            }
            throw new Error(`OpenAI API error: ${errorMessage}`);
          }

          const result = await response.json();
          console.log('%c Speech-to-Text result:', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', result.text);
          return result.text;
        } catch (fetchError) {
          clearTimeout(timeoutId); // Clear the timeout in case of error

          // Check if this was a timeout
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
          }

          throw fetchError;
        }
      } catch (error) {
        console.error('Error in speechToText request:', error);
        throw error;
      }
    };

    try {
      // Add the request to the rate limit queue
      return await this.addToRateLimitQueue(makeRequest);
    } catch (error) {
      console.error('Error in speechToText:', error);

      // If this is a rate limit error, show a specific message and retry
      if (error.message && error.message.includes('RATE_LIMIT_ERROR')) {
        import('../utils').then(utils => {
          utils.showToast(
            'Rate limit reached for speech recognition. Your request has been queued and will be processed automatically.',
            5000,
            'warning'
          );
        });

        // Wait for 20 seconds (OpenAI's suggested retry time) and try again
        await new Promise(resolve => setTimeout(resolve, 20000));
        return await this.addToRateLimitQueue(makeRequest);
      }

      throw error;
    }
  }

  /**
   * Play audio from a blob
   * @param {Blob} audioBlob - The audio blob to play
   * @returns {Promise<void>} A promise that resolves when the audio finishes playing
   */
  playAudio(audioBlob, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        const volume = typeof options.volume === 'number' ? Math.min(Math.max(options.volume, 0), 1) : 1;
        audio.volume = volume;

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

  /**
   * Get the number of API calls made in the current session
   * @returns {number} The number of API calls
   */
  getApiCallCount() {
    return this.apiCallCount;
  }

  /**
   * Reset the API call counter
   */
  resetApiCallCount() {
    this.apiCallCount = 0;
  }

  /**
   * Toggle debug mode
   * @param {boolean} enabled - Whether debug mode should be enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    localStorage.setItem('openai_debug_mode', enabled.toString());
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} Whether debug mode is enabled
   */
  isDebugMode() {
    return this.debugMode;
  }

  /**
   * Check if we can make a request without hitting rate limits
   * @returns {boolean} Whether we can make a request
   */
  canMakeRequest() {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    );

    return this.requestTimestamps.length < this.requestsPerMinute;
  }

  /**
   * Add a request to the rate limit queue
   * @param {Function} requestFn - The function to call when the rate limit allows
   * @returns {Promise<any>} A promise that resolves with the result of the request
   */
  async addToRateLimitQueue(requestFn) {
    return new Promise((resolve, reject) => {
      this.rateLimitQueue.push({ requestFn, resolve, reject });

      // Start processing the queue if not already processing
      if (!this.isProcessingQueue) {
        this.processRateLimitQueue();
      }
    });
  }

  /**
   * Process the rate limit queue
   */
  async processRateLimitQueue() {
    if (this.rateLimitQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;

    if (this.canMakeRequest()) {
      const { requestFn, resolve, reject } = this.rateLimitQueue.shift();

      // Record this request
      this.requestTimestamps.push(Date.now());

      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Process the next item after a short delay
      setTimeout(() => this.processRateLimitQueue(), 300);
    } else {
      // Wait until we can make another request
      const waitTime = 60000 / this.requestsPerMinute;

      // Show a toast notification about rate limiting
      import('../utils').then(utils => {
        utils.showToast(
          `Rate limit reached. Waiting ${Math.round(waitTime / 1000)} seconds before next request...`,
          3000,
          'warning'
        );
      });

      console.log(`Rate limit reached. Waiting ${waitTime}ms before next request...`);

      setTimeout(() => this.processRateLimitQueue(), waitTime);
    }
  }

  /**
   * Set the requests per minute limit
   * @param {number} rpm - Requests per minute
   */
  setRequestsPerMinute(rpm) {
    this.requestsPerMinute = rpm;
  }

  /**
   * Get the current requests per minute limit
   * @returns {number} Requests per minute
   */
  getRequestsPerMinute() {
    return this.requestsPerMinute;
  }

  /**
   * Get the number of requests in the queue
   * @returns {number} Queue length
   */
  getQueueLength() {
    return this.rateLimitQueue.length;
  }

}

// Create a singleton instance
const openaiService = new OpenAIService();

export default openaiService;
