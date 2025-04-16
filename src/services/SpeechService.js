/**
 * Speech Service - Handles Text-to-Speech and Speech-to-Text functionality
 */

// Text-to-Speech functionality
class TextToSpeech {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.isInitialized = false;
    this.defaultVoice = null;
    this.defaultRate = 1.0;
    this.defaultPitch = 1.0;
    this.defaultVolume = 1.0;
    this.isSpeaking = false;
    
    // Initialize voices when available
    if (this.synth) {
      this.initVoices();
    }
  }

  // Initialize available voices
  initVoices() {
    // Some browsers need a small delay to load voices
    setTimeout(() => {
      this.voices = this.synth.getVoices();
      
      if (this.voices.length > 0) {
        // Try to find a good default voice
        this.defaultVoice = this.voices.find(voice => 
          voice.lang.includes(navigator.language) && !voice.localService
        );
        
        // Fallback to any voice if no match
        if (!this.defaultVoice) {
          this.defaultVoice = this.voices[0];
        }
        
        this.isInitialized = true;
      }
    }, 100);
  }

  // Speak text with given parameters
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported in this browser'));
        return;
      }

      // Cancel any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice and parameters
      utterance.voice = options.voice || this.defaultVoice;
      utterance.rate = options.rate || this.defaultRate;
      utterance.pitch = options.pitch || this.defaultPitch;
      utterance.volume = options.volume || this.defaultVolume;
      
      // Set event handlers
      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };
      
      utterance.onerror = (event) => {
        this.isSpeaking = false;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };
      
      // Start speaking
      this.isSpeaking = true;
      this.synth.speak(utterance);
    });
  }

  // Stop any ongoing speech
  stop() {
    if (this.synth && this.isSpeaking) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  // Get available voices
  getVoices() {
    return this.voices;
  }

  // Check if speech synthesis is supported
  isSupported() {
    return 'speechSynthesis' in window;
  }
}

// Speech-to-Text functionality
class SpeechToText {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.transcript = '';
    this.confidence = 0;
    this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    if (this.isSupported) {
      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = navigator.language || 'en-US';
    }
  }

  // Start listening for speech
  start() {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Speech recognition not supported in this browser'));
        return;
      }

      if (this.isListening) {
        this.stop();
      }

      this.transcript = '';
      this.confidence = 0;
      
      // Set up event handlers
      this.recognition.onresult = (event) => {
        const result = event.results[0][0];
        this.transcript = result.transcript;
        this.confidence = result.confidence;
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
        resolve({
          transcript: this.transcript,
          confidence: this.confidence
        });
      };
      
      this.recognition.onerror = (event) => {
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };
      
      // Start listening
      this.isListening = true;
      this.recognition.start();
    });
  }

  // Stop listening
  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // Check if speech recognition is supported
  checkSupport() {
    return this.isSupported;
  }
}

// Text comparison utility for speech recognition feedback
class TextComparison {
  // Compare two texts and return similarity score (0-1)
  static getSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    // Normalize texts for comparison
    const normalizedText1 = this.normalizeText(text1);
    const normalizedText2 = this.normalizeText(text2);
    
    // Use Levenshtein distance for comparison
    const distance = this.levenshteinDistance(normalizedText1, normalizedText2);
    const maxLength = Math.max(normalizedText1.length, normalizedText2.length);
    
    // Return similarity score (1 - normalized distance)
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }
  
  // Normalize text for comparison (lowercase, remove punctuation, extra spaces)
  static normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Calculate Levenshtein distance between two strings
  static levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    
    // Create distance matrix
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return dp[m][n];
  }
  
  // Get feedback based on similarity score
  static getFeedback(score) {
    if (score >= 0.9) return { result: 'excellent', message: 'Excellent!' };
    if (score >= 0.75) return { result: 'good', message: 'Good job!' };
    if (score >= 0.5) return { result: 'fair', message: 'Fair, try again' };
    return { result: 'poor', message: 'Try again' };
  }
}

// Export a singleton instance of each service
export const tts = new TextToSpeech();
export const stt = new SpeechToText();
export const textComparison = TextComparison;

// Export a session tracker for practice statistics
export class SessionTracker {
  constructor() {
    this.attempts = [];
    this.startTime = null;
    this.endTime = null;
  }
  
  // Start a new session
  startSession() {
    this.attempts = [];
    this.startTime = new Date();
    this.endTime = null;
  }
  
  // End the session
  endSession() {
    this.endTime = new Date();
  }
  
  // Record an attempt
  recordAttempt(lineIndex, originalText, spokenText, similarityScore) {
    this.attempts.push({
      lineIndex,
      originalText,
      spokenText,
      similarityScore,
      timestamp: new Date(),
      attemptNumber: this.getAttemptsForLine(lineIndex).length + 1
    });
  }
  
  // Get all attempts for a specific line
  getAttemptsForLine(lineIndex) {
    return this.attempts.filter(attempt => attempt.lineIndex === lineIndex);
  }
  
  // Get session duration in seconds
  getDuration() {
    if (!this.startTime) return 0;
    const end = this.endTime || new Date();
    return Math.round((end - this.startTime) / 1000);
  }
  
  // Get session summary
  getSummary() {
    const totalLines = new Set(this.attempts.map(a => a.lineIndex)).size;
    const totalAttempts = this.attempts.length;
    const averageScore = this.attempts.length > 0 
      ? this.attempts.reduce((sum, a) => sum + a.similarityScore, 0) / totalAttempts 
      : 0;
    
    const excellentCount = this.attempts.filter(a => a.similarityScore >= 0.9).length;
    const goodCount = this.attempts.filter(a => a.similarityScore >= 0.75 && a.similarityScore < 0.9).length;
    const fairCount = this.attempts.filter(a => a.similarityScore >= 0.5 && a.similarityScore < 0.75).length;
    const poorCount = this.attempts.filter(a => a.similarityScore < 0.5).length;
    
    return {
      totalLines,
      totalAttempts,
      averageScore,
      duration: this.getDuration(),
      performance: {
        excellent: excellentCount,
        good: goodCount,
        fair: fairCount,
        poor: poorCount
      },
      attemptsPerLine: totalLines > 0 ? (totalAttempts / totalLines).toFixed(1) : 0
    };
  }
}

export const sessionTracker = new SessionTracker();
