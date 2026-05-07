import { withAccessTokenHeader, clearAccessToken } from "../lib/accessToken";

async function handleInvalidAccessTokenResponse(
  response: Response,
): Promise<void> {
  if (response.status !== 401) return;
  try {
    const data = (await response.clone().json()) as { error?: string };
    if (data?.error === "invalid_access_token") clearAccessToken();
  } catch {
    /* ignore */
  }
}

export interface TtsOptions {
  voice?: string;
  speed?: number;
  model?: string;
}

export interface SttOptions {
  language?: string;
}

export interface AudioPlaybackDiagnostics {
  currentTime: number | null;
  duration: number | null;
  ended: boolean;
  errorCode?: number;
  errorMessage?: string;
  muted: boolean;
  networkState: number;
  paused: boolean;
  readyState: number;
  volume: number;
}

export interface PlayAudioOptions {
  onEnded?: (diagnostics: AudioPlaybackDiagnostics) => void;
  onError?: (diagnostics: AudioPlaybackDiagnostics) => void;
  volume?: number;
}

export const MIN_STT_UPLOAD_BYTES = 1024;
const AUDIO_PRIME_TIMEOUT_MS = 900;
const AUDIO_PLAY_START_TIMEOUT_MS = 5000;
const STT_REQUEST_TIMEOUT_MS = 65_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildSilentWavDataUrl(durationMs = 250, sampleRate = 8000): string {
  const samples = Math.max(1, Math.round((durationMs / 1000) * sampleRate));
  const dataBytes = samples * 2;
  const bytes = new Uint8Array(44 + dataBytes);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      bytes[offset + i] = value.charCodeAt(i);
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);

  return `data:audio/wav;base64,${bytesToBase64(bytes)}`;
}

const SILENT_WAV_DATA_URL = buildSilentWavDataUrl();

class OpenAIService {
  private readonly serverBaseUrl = "/api";
  private readonly serverTtsEndpoint = "/tts/speech";
  private readonly serverSttEndpoint = "/audio/transcriptions";
  private readonly audioCache = new Map<string, Blob>();
  private apiCallCount = 0;
  // Keep one reusable <audio> element for TTS playback. iOS Safari is much
  // less tolerant of repeated new Audio().play() calls during a long async
  // sequence, especially after recording. Reusing one user-primed element keeps
  // playback tied to the original tap while still allowing per-line progress.
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private currentPlaybackCancel: ((reason: string) => void) | null = null;

  private getPlaybackAudio(): HTMLAudioElement {
    if (!this.currentAudio) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.setAttribute("playsinline", "true");
      this.currentAudio = audio;
    }
    return this.currentAudio;
  }

  private audioDiagnostics(
    audio: HTMLAudioElement,
    error?: MediaError | null,
  ): AudioPlaybackDiagnostics {
    return {
      currentTime: Number.isFinite(audio.currentTime)
        ? audio.currentTime
        : null,
      duration: Number.isFinite(audio.duration) ? audio.duration : null,
      ended: audio.ended,
      errorCode: error?.code,
      errorMessage: error?.message || undefined,
      muted: audio.muted,
      networkState: audio.networkState,
      paused: audio.paused,
      readyState: audio.readyState,
      volume: audio.volume,
    };
  }

  private clearCurrentAudioSource(reason = "Audio playback cancelled"): void {
    const audio = this.currentAudio;
    const url = this.currentAudioUrl;
    const cancelPlayback = this.currentPlaybackCancel;

    this.currentAudioUrl = null;
    this.currentPlaybackCancel = null;

    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      } catch {
        // ignore cleanup errors
      }
    }
    if (url) {
      URL.revokeObjectURL(url);
    }
    if (cancelPlayback) {
      cancelPlayback(reason);
    }
  }

  async textToSpeech(text: string, options: TtsOptions = {}): Promise<Blob> {
    if (!text || text.trim() === "") throw new Error("Text is required");

    const voice = options.voice;
    const speed = options.speed;
    const model = options.model;

    const cacheKey = `${text}_${voice ?? "default"}_${speed ?? "default"}_${model ?? "default"}`;
    const cached = this.audioCache.get(cacheKey);
    if (cached) return cached;

    const body: Record<string, unknown> = { text };
    if (voice) body.voice = voice;
    if (typeof speed === "number") body.speed = speed;
    if (model) body.model = model;

    const authToken = localStorage.getItem("authToken");
    const response = await fetch(
      `${this.serverBaseUrl}${this.serverTtsEndpoint}`,
      {
        method: "POST",
        headers: withAccessTokenHeader({
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        }),
        body: JSON.stringify(body),
      },
    );
    await handleInvalidAccessTokenResponse(response);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = (await response.json()) as { error?: string };
        errorMessage = errorData.error ?? errorMessage;
      } catch {
        // ignore
      }
      const err = new Error(errorMessage) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    const cacheStatus = response.headers.get("X-TTS-Cache-Status");
    if (cacheStatus === "MISS") {
      this.apiCallCount += 1;
    }

    const audioBlob = await response.blob();
    this.audioCache.set(cacheKey, audioBlob);
    return audioBlob;
  }

  async speechToText(
    audioBlob: Blob,
    options: SttOptions = {},
  ): Promise<string> {
    if (!audioBlob) throw new Error("Audio data is required");
    if (audioBlob.size < MIN_STT_UPLOAD_BYTES) {
      throw new Error("Audio data is too short. Please record again.");
    }

    const formData = new FormData();
    let fileExtension = "webm";
    if (audioBlob.type.includes("mp4")) fileExtension = "mp4";
    else if (audioBlob.type.includes("ogg")) fileExtension = "ogg";

    formData.append("file", audioBlob, `recording.${fileExtension}`);
    if (options.language) formData.append("language", options.language);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      STT_REQUEST_TIMEOUT_MS,
    );

    const authToken = localStorage.getItem("authToken");
    try {
      const response = await fetch(
        `${this.serverBaseUrl}${this.serverSttEndpoint}`,
        {
          method: "POST",
          headers: withAccessTokenHeader(
            authToken ? { Authorization: `Bearer ${authToken}` } : {},
          ),
          body: formData,
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      await handleInvalidAccessTokenResponse(response);

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
        try {
          const error = (await response.json()) as {
            error?: string | { message?: string };
          };
          if (typeof error.error === "string") {
            errorMessage = error.error;
          } else {
            errorMessage = error.error?.message ?? errorMessage;
          }
        } catch {
          // ignore
        }
        const err = new Error(errorMessage) as Error & { status?: number };
        err.status = response.status;
        throw err;
      }

      this.apiCallCount += 1;
      const result = (await response.json()) as { text: string };
      return result.text;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Request timed out. Please try again.");
      }
      throw err;
    }
  }

  primeAudioPlayback(): Promise<boolean> {
    const audio = this.getPlaybackAudio();
    const previousMuted = audio.muted;
    const previousVolume = audio.volume;

    try {
      this.clearCurrentAudioSource();
      audio.muted = false;
      audio.volume = 1;
      audio.preload = "auto";
      audio.src = SILENT_WAV_DATA_URL;
      audio.load();

      return new Promise<boolean>((resolve) => {
        let settled = false;
        const cleanup = (primed: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          audio.onended = null;
          audio.onerror = null;
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {
            // ignore
          }
          try {
            audio.removeAttribute("src");
            audio.load();
          } catch {
            // ignore
          }
          audio.muted = previousMuted;
          audio.volume = previousVolume;
          resolve(primed);
        };

        const timeoutId = window.setTimeout(
          () => cleanup(false),
          AUDIO_PRIME_TIMEOUT_MS,
        );

        audio.onended = () => cleanup(true);
        audio.onerror = () => cleanup(false);
        audio.play().then(
          () => cleanup(true),
          () => cleanup(false),
        );
      });
    } catch {
      audio.muted = previousMuted;
      audio.volume = previousVolume;
      return Promise.resolve(false);
    }
  }

  playAudio(audioBlob: Blob, options: PlayAudioOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      // Defensive: stop and clean up any previously playing audio before
      // starting a new one. Callers are expected to await sequentially, but
      // this guards against races (e.g. component unmount + new playback).
      this.clearCurrentAudioSource();

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = this.getPlaybackAudio();

      // Pin the object URL until playback settles.
      this.currentAudioUrl = audioUrl;

      let settled = false;
      let startTimeoutId: number | null = null;
      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
        audio.onplaying = null;
        if (startTimeoutId !== null) {
          clearTimeout(startTimeoutId);
          startTimeoutId = null;
        }
        if (this.currentPlaybackCancel === cancelPlayback) {
          this.currentPlaybackCancel = null;
        }
        if (this.currentAudioUrl === audioUrl) {
          this.currentAudioUrl = null;
          try {
            audio.removeAttribute("src");
            audio.load();
          } catch {
            // ignore cleanup errors
          }
          URL.revokeObjectURL(audioUrl);
        }
      };
      const settleResolve = () => {
        if (settled) return;
        settled = true;
        options.onEnded?.(this.audioDiagnostics(audio));
        cleanup();
        resolve();
      };
      const settleReject = (err: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      };
      const cancelPlayback = (reason: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        const err = new Error(reason);
        err.name = "AbortError";
        reject(err);
      };

      try {
        const volume =
          typeof options.volume === "number"
            ? Math.min(Math.max(options.volume, 0), 1)
            : 1;
        audio.volume = volume;
        audio.preload = "auto";
        audio.src = audioUrl;
        audio.load();

        this.currentPlaybackCancel = cancelPlayback;
        audio.onended = settleResolve;
        audio.onplaying = () => {
          if (startTimeoutId !== null) {
            clearTimeout(startTimeoutId);
            startTimeoutId = null;
          }
        };
        audio.onerror = (event) => {
          const target =
            event instanceof Event
              ? (event.target as HTMLAudioElement | null)
              : null;
          const mediaErr = target?.error ?? null;
          const code = mediaErr?.code;
          const msg = mediaErr?.message;
          options.onError?.(this.audioDiagnostics(audio, mediaErr));
          settleReject(
            new Error(
              `Audio playback error${code !== undefined ? ` (code ${code})` : ""}${msg ? `: ${msg}` : ""}`,
            ),
          );
        };

        startTimeoutId = window.setTimeout(() => {
          options.onError?.(this.audioDiagnostics(audio, audio.error));
          settleReject(new Error("Audio playback did not start."));
        }, AUDIO_PLAY_START_TIMEOUT_MS);

        audio
          .play()
          .then(() => {
            if (startTimeoutId !== null) {
              clearTimeout(startTimeoutId);
              startTimeoutId = null;
            }
          })
          .catch((err) => {
            options.onError?.(this.audioDiagnostics(audio, audio.error));
            settleReject(err);
          });
      } catch (err) {
        settleReject(err);
      }
    });
  }

  stopAudio(reason = "Audio playback stopped"): void {
    this.clearCurrentAudioSource(reason);
  }

  clearCache(): void {
    this.audioCache.clear();
  }

  getApiCallCount(): number {
    return this.apiCallCount;
  }

  resetApiCallCount(): void {
    this.apiCallCount = 0;
  }
}

const openaiService = new OpenAIService();
export default openaiService;
