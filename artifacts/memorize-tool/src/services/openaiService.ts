import { withAccessTokenHeader, clearAccessToken } from "../lib/accessToken";

async function handleInvalidAccessTokenResponse(response: Response): Promise<void> {
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

class OpenAIService {
  private readonly serverBaseUrl = "/api";
  private readonly serverTtsEndpoint = "/tts/speech";
  private readonly serverSttEndpoint = "/audio/transcriptions";
  private readonly audioCache = new Map<string, Blob>();
  private apiCallCount = 0;
  // Hold a strong reference to the currently playing <audio> element while it
  // plays. Without this, the only references are inside the Promise executor
  // closure of `playAudio`, which is eligible for garbage collection once the
  // executor returns. Under memory pressure (long audio, background tab,
  // mobile) the browser could collect the element mid-playback and silently
  // truncate longer lines.
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;

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
    const response = await fetch(`${this.serverBaseUrl}${this.serverTtsEndpoint}`, {
      method: "POST",
      headers: withAccessTokenHeader({
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      }),
      body: JSON.stringify(body),
    });
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

  async speechToText(audioBlob: Blob, options: SttOptions = {}): Promise<string> {
    if (!audioBlob) throw new Error("Audio data is required");

    const formData = new FormData();
    let fileExtension = "webm";
    if (audioBlob.type.includes("mp4")) fileExtension = "mp4";
    else if (audioBlob.type.includes("ogg")) fileExtension = "ogg";

    formData.append("file", audioBlob, `recording.${fileExtension}`);
    if (options.language) formData.append("language", options.language);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const authToken = localStorage.getItem("authToken");
    try {
      const response = await fetch(`${this.serverBaseUrl}${this.serverSttEndpoint}`, {
        method: "POST",
        headers: withAccessTokenHeader(
          authToken ? { Authorization: `Bearer ${authToken}` } : {},
        ),
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      await handleInvalidAccessTokenResponse(response);

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
        try {
          const error = (await response.json()) as { error?: string | { message?: string } };
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

  playAudio(audioBlob: Blob, options: { volume?: number } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      // Defensive: stop and clean up any previously playing audio before
      // starting a new one. Callers are expected to await sequentially, but
      // this guards against races (e.g. component unmount + new playback).
      this.stopAudio();

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio();

      // Pin to the service instance so the GC can't collect the element
      // (and its in-flight decode buffer) while it's still playing.
      this.currentAudio = audio;
      this.currentAudioUrl = audioUrl;

      let settled = false;
      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.currentAudioUrl = null;
        }
        URL.revokeObjectURL(audioUrl);
      };
      const settleResolve = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const settleReject = (err: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      try {
        const volume = typeof options.volume === "number" ? Math.min(Math.max(options.volume, 0), 1) : 1;
        audio.volume = volume;
        audio.preload = "auto";
        audio.src = audioUrl;

        audio.onended = settleResolve;
        audio.onerror = (event) => {
          const target = event instanceof Event ? (event.target as HTMLAudioElement | null) : null;
          const mediaErr = target?.error ?? null;
          const code = mediaErr?.code;
          const msg = mediaErr?.message;
          settleReject(
            new Error(
              `Audio playback error${code !== undefined ? ` (code ${code})` : ""}${msg ? `: ${msg}` : ""}`,
            ),
          );
        };

        audio.play().catch(settleReject);
      } catch (err) {
        settleReject(err);
      }
    });
  }

  stopAudio(): void {
    const audio = this.currentAudio;
    const url = this.currentAudioUrl;
    this.currentAudio = null;
    this.currentAudioUrl = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      } catch {
        // ignore
      }
    }
    if (url) {
      URL.revokeObjectURL(url);
    }
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
