interface TTSOptions {
  voice?: SpeechSynthesisVoice | { lang: string; name: string } | null;
  volume?: number;
  rate?: number;
  pitch?: number;
  lang?: string;
}

interface TTSConfig {
  useWebSpeech: boolean;
  useGoogleTTS: boolean;
  useProxy: boolean;
  proxyUrl: string;
  defaultVolume: number;
  defaultRate: number;
  defaultPitch: number;
  googleTTSUrl: string;
}

class TTSService {
  initialized: boolean;
  webSpeechAvailable: boolean;
  currentAudio: HTMLAudioElement | null;
  isSpeaking: boolean;
  userInteracted: boolean;
  voices: SpeechSynthesisVoice[];
  defaultVoice: SpeechSynthesisVoice | null;

  lastSpokenText: string;
  lastSpokenOptions: TTSOptions;
  speakCalled: boolean;
  isTestMode: boolean;

  config: TTSConfig;

  constructor() {
    this.initialized = false;
    this.webSpeechAvailable = 'speechSynthesis' in window;
    this.currentAudio = null;
    this.isSpeaking = false;
    this.userInteracted = false;
    this.voices = [];
    this.defaultVoice = null;

    this.lastSpokenText = '';
    this.lastSpokenOptions = {};
    this.speakCalled = false;
    this.isTestMode = false;

    this.config = {
      useWebSpeech: true,
      useGoogleTTS: true,
      useProxy: false,
      proxyUrl: '/api/tts-proxy',
      defaultVolume: 1.0,
      defaultRate: 1.0,
      defaultPitch: 1.0,
      googleTTSUrl: 'https://translate.google.com/translate_tts'
    };

    if (this.webSpeechAvailable && !this.isInTestEnvironment()) {
      this.initWebSpeech();
    }

    this.setupUserInteractionTracking();
  }

  isInTestEnvironment(): boolean {
    return typeof (window as unknown as { Cypress?: unknown }).Cypress !== 'undefined' || this.isTestMode;
  }

  initWebSpeech() {
    if (!this.webSpeechAvailable) return;

    this.voices = window.speechSynthesis.getVoices();

    if (this.voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
        this.setupDefaultVoice();
        this.initialized = true;
      };
    } else {
      this.setupDefaultVoice();
      this.initialized = true;
    }
  }

  setupDefaultVoice() {
    const browserLang = navigator.language || 'en-US';

    this.defaultVoice = this.voices.find(
      voice => voice.lang.includes(browserLang) && !voice.localService
    ) || null;

    if (!this.defaultVoice) {
      this.defaultVoice = this.voices.find(voice => !voice.localService) || null;
    }

    if (!this.defaultVoice && this.voices.length > 0) {
      this.defaultVoice = this.voices[0];
    }
  }

  setupUserInteractionTracking() {
    const interactionEvents = ['click', 'touchstart', 'keydown'];

    const handleUserInteraction = () => {
      this.userInteracted = true;
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };

    interactionEvents.forEach(event => {
      document.addEventListener(event, handleUserInteraction);
    });
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  isAvailable(): boolean {
    return this.webSpeechAvailable || this.config.useGoogleTTS;
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!text || text.trim() === '') {
      return Promise.resolve();
    }

    this.lastSpokenText = text;
    this.lastSpokenOptions = { ...options };
    this.speakCalled = true;

    if (this.isInTestEnvironment()) {
      this.isSpeaking = true;
      const duration = Math.min(Math.max(text.length * 50, 500), 3000);
      await new Promise(resolve => setTimeout(resolve, duration));
      this.isSpeaking = false;
      return Promise.resolve();
    }

    this.stop();

    const opts = {
      voice: options.voice || this.defaultVoice,
      volume: options.volume ?? this.config.defaultVolume,
      rate: options.rate ?? this.config.defaultRate,
      pitch: options.pitch ?? this.config.defaultPitch,
      lang: options.lang || (options.voice ? (options.voice as SpeechSynthesisVoice).lang : 'en-US')
    };

    if (typeof document !== 'undefined') {
      const event = new CustomEvent('tts-speak-called', { detail: { text, options: opts } });
      document.dispatchEvent(event);
    }

    if (this.config.useWebSpeech && this.webSpeechAvailable) {
      try {
        await this.speakWithWebSpeech(text, opts);
        return;
      } catch (error) {
        console.warn('Web Speech API failed:', error);
      }
    }

    if (this.config.useGoogleTTS) {
      try {
        await this.speakWithGoogleTTS(text, opts);
        return;
      } catch (error) {
        console.error('Google TTS failed:', error);
        throw new Error('All TTS methods failed');
      }
    }

    throw new Error('No TTS method available');
  }

  speakWithWebSpeech(text: string, options: { voice: unknown; volume: number; rate: number; pitch: number; lang: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.webSpeechAvailable) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = options.voice as SpeechSynthesisVoice;
      utterance.volume = options.volume;
      utterance.rate = options.rate;
      utterance.pitch = options.pitch;
      utterance.lang = options.lang;

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        reject(new Error(`Web Speech error: ${event.error}`));
      };

      window.speechSynthesis.speak(utterance);
      this.isSpeaking = true;

      setTimeout(() => {
        if (this.isSpeaking && window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
      }, 1000);

      setTimeout(() => {
        if (this.isSpeaking) {
          this.isSpeaking = false;
          resolve();
        }
      }, 15000);
    });
  }

  speakWithGoogleTTS(text: string, options: { volume: number; lang: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio = null;
        }

        const trimmedText = text.length > 200 ? text.substring(0, 197) + '...' : text;
        const encodedText = encodeURIComponent(trimmedText);

        let langCode = 'en';
        if (options.lang) {
          langCode = options.lang.split('-')[0];
        }

        let audioUrl: string;
        if (this.config.useProxy) {
          audioUrl = `${this.config.proxyUrl}?text=${encodedText}&lang=${langCode}`;
        } else {
          audioUrl = `${this.config.googleTTSUrl}?ie=UTF-8&q=${encodedText}&tl=${langCode}&client=tw-ob`;
        }

        this.currentAudio = new Audio();
        this.currentAudio.crossOrigin = 'anonymous';
        this.currentAudio.volume = options.volume;
        this.currentAudio.src = audioUrl;

        this.currentAudio.onplay = () => { this.isSpeaking = true; };
        this.currentAudio.onended = () => {
          this.isSpeaking = false;
          resolve();
        };
        this.currentAudio.onerror = (err) => {
          this.isSpeaking = false;
          const target = (typeof err === 'object' && err !== null && 'target' in err)
            ? (err as Event).target as HTMLAudioElement
            : null;
          reject(new Error(`Google TTS error: ${target?.error?.message || 'Unknown error'}`));
        };

        this.currentAudio.play().catch(err => {
          reject(new Error(`Failed to play Google TTS audio: ${err.message}`));
        });

        setTimeout(() => {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            resolve();
          }
        }, 15000);
      } catch (err) {
        reject(new Error(`Unexpected error in Google TTS: ${(err as Error).message}`));
      }
    });
  }

  stop() {
    if (this.isInTestEnvironment()) {
      this.isSpeaking = false;
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('tts-stop-called'));
      }
      return;
    }

    if (this.webSpeechAvailable) {
      window.speechSynthesis.cancel();
    }

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    this.isSpeaking = false;

    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('tts-stop-called'));
    }
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  updateConfig(newConfig: Partial<TTSConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

const ttsService = new TTSService();

if (typeof window !== 'undefined') {
  (window as unknown as { ttsService: TTSService }).ttsService = ttsService;
}

export default ttsService;
