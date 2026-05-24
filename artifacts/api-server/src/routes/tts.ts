import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { z } from "zod/v4";
import {
  getTtsCacheProvider,
  readTtsCache,
  writeTtsCache,
} from "../lib/ttsStorage";
import { requireAccessToken } from "../middleware/requireAccessToken";

const router: IRouter = Router();
router.use("/tts", requireAccessToken);

const ALLOWED_MODELS = ["google/gemini-3.1-flash-tts-preview"] as const;
const DEFAULT_MODEL = "google/gemini-3.1-flash-tts-preview";
const DEFAULT_VOICE = "Zephyr";

const PCM_DEFAULT_SAMPLE_RATE = 24_000;
const PCM_DEFAULT_CHANNELS = 1;
const PCM_DEFAULT_BITS_PER_SAMPLE = 16;
const MIN_TTS_AUDIO_BYTES = 1024;
const MAX_TTS_AUDIO_ATTEMPTS = 2;
const SHORT_TTS_FALLBACK_MAX_CHARS = 24;
const SHORT_TTS_FALLBACK_MAX_WORDS = 3;
const SHORT_TTS_FALLBACK_PREFIX =
  "[in italiano, battuta teatrale naturale, pronuncia letteralmente]";

const MAX_TTS_TEXT_LENGTH = 5_000;
const INVALID_TTS_AUDIO_MESSAGE =
  "TTS provider returned empty or invalid audio.";

const speechBodySchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(
      MAX_TTS_TEXT_LENGTH,
      `Text must be at most ${MAX_TTS_TEXT_LENGTH} characters`,
    ),
  voice: z.string().optional(),
  speed: z.number().min(0.25).max(4).optional(),
  model: z.enum(ALLOWED_MODELS).optional(),
  cacheOnly: z.boolean().optional(),
});

const inFlight = new Map<string, Promise<Buffer>>();

function generateCacheKey(
  text: string,
  voice: string,
  speed: number,
  model: string,
): string {
  return crypto
    .createHash("sha256")
    .update(`${model}\u0001${voice}\u0001${speed}\u0001${text}`)
    .digest("hex");
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface PcmFormat {
  sampleRate: number;
  channelCount: number;
  bitsPerSample: number;
}

function parsePcmFormat(contentType: string | null): PcmFormat {
  const fmt: PcmFormat = {
    sampleRate: PCM_DEFAULT_SAMPLE_RATE,
    channelCount: PCM_DEFAULT_CHANNELS,
    bitsPerSample: PCM_DEFAULT_BITS_PER_SAMPLE,
  };
  if (!contentType) return fmt;
  const params = new Map<string, string>();
  for (const part of contentType.split(";").slice(1)) {
    const [k, v] = part.split("=");
    if (k && v) params.set(k.trim().toLowerCase(), v.trim());
  }
  return {
    sampleRate:
      parsePositiveInt(params.get("rate")) ??
      parsePositiveInt(params.get("sample-rate")) ??
      parsePositiveInt(params.get("samplerate")) ??
      fmt.sampleRate,
    channelCount:
      parsePositiveInt(params.get("channels")) ??
      parsePositiveInt(params.get("channel-count")) ??
      fmt.channelCount,
    bitsPerSample:
      parsePositiveInt(params.get("bits")) ??
      parsePositiveInt(params.get("bit-depth")) ??
      fmt.bitsPerSample,
  };
}

function isPcmContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const mime = contentType.split(";", 1)[0]?.trim().toLowerCase();
  return (
    mime === "audio/pcm" ||
    mime === "audio/l16" ||
    mime === "application/octet-stream"
  );
}

function buildWavFromPcm(pcm: Buffer, format: PcmFormat): Buffer {
  const bytesPerSample = format.bitsPerSample / 8;
  const blockAlign = format.channelCount * bytesPerSample;
  const byteRate = format.sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(format.channelCount, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(format.bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function hasWavHeader(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WAVE"
  );
}

function wavDataBytes(buffer: Buffer): number | null {
  if (!hasWavHeader(buffer)) return null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.subarray(offset, offset + 4).toString("ascii");
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === "data") return chunkSize;
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

function isUsableTtsAudio(buffer: Buffer): boolean {
  if (buffer.length < MIN_TTS_AUDIO_BYTES) return false;
  const dataBytes = wavDataBytes(buffer);
  return dataBytes === null || dataBytes >= MIN_TTS_AUDIO_BYTES;
}

function assertUsableTtsAudio(buffer: Buffer): void {
  if (isUsableTtsAudio(buffer)) return;
  throw new Error(INVALID_TTS_AUDIO_MESSAGE);
}

function isInvalidTtsAudioError(err: unknown): boolean {
  return err instanceof Error && err.message === INVALID_TTS_AUDIO_MESSAGE;
}

function cleanTtsTextForFallbackDecision(text: string): string {
  return text
    .replace(/\[[^\]]*]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldUseShortTtsFallback(text: string): boolean {
  const clean = cleanTtsTextForFallbackDecision(text);
  if (!clean) return false;
  const words = clean.split(/\s+/).filter(Boolean).length;
  return (
    clean.length <= SHORT_TTS_FALLBACK_MAX_CHARS ||
    words <= SHORT_TTS_FALLBACK_MAX_WORDS
  );
}

function buildShortTtsFallbackInput(text: string): string {
  if (text.includes(SHORT_TTS_FALLBACK_PREFIX)) return text;
  return `${SHORT_TTS_FALLBACK_PREFIX} ${text}`;
}

function finishTtsAudio(raw: Buffer, contentType: string | null): Buffer {
  if (hasWavHeader(raw)) return raw;
  if (isPcmContentType(contentType)) {
    return buildWavFromPcm(raw, parsePcmFormat(contentType));
  }
  // We request PCM from OpenRouter, but some gateways return it as an
  // unspecified binary stream. Serving those bytes as audio/wav without a WAV
  // header makes browser playback fail, so default to wrapping the response.
  return buildWavFromPcm(raw, parsePcmFormat(contentType));
}

router.get("/tts/health", (_req, res): void => {
  res.json({
    status: "TTS service is running",
    storage: getTtsCacheProvider(),
    fetchAvailable: typeof fetch === "function",
    provider: "openrouter",
    model: DEFAULT_MODEL,
    voice: DEFAULT_VOICE,
    configured: Boolean(process.env.OPENROUTER_API_KEY),
  });
});

router.post("/tts/speech", async (req, res): Promise<void> => {
  const parsed = speechBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  const { text } = parsed.data;
  const voice = parsed.data.voice ?? DEFAULT_VOICE;
  const speed = parsed.data.speed ?? 1.0;
  const model = parsed.data.model ?? DEFAULT_MODEL;
  const cacheOnly = parsed.data.cacheOnly === true;

  const cacheKey = generateCacheKey(text, voice, speed, model);

  // Try cache first (cached payload is already a finished WAV file)
  const cached = await readTtsCache(cacheKey).catch(() => null);
  if (cached && isUsableTtsAudio(cached)) {
    req.log.info({ model, voice, key: cacheKey }, "TTS cache hit");
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-TTS-Cache-Status", "HIT");
    res.setHeader("X-TTS-Cache-Source", getTtsCacheProvider().toUpperCase());
    res.setHeader("X-TTS-Cache-Key", cacheKey);
    res.send(cached);
    return;
  } else if (cached) {
    req.log.warn(
      { model, voice, key: cacheKey, bytes: cached.length },
      "Ignoring invalid TTS cache entry",
    );
  }

  if (cacheOnly) {
    req.log.info({ model, voice, key: cacheKey }, "TTS cache-only miss");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-TTS-Cache-Status", "MISS");
    res.setHeader("X-TTS-Cache-Source", getTtsCacheProvider().toUpperCase());
    res.setHeader("X-TTS-Cache-Key", cacheKey);
    res.status(204).send();
    return;
  }

  if (!apiKey) {
    req.log.error("OPENROUTER_API_KEY is not configured");
    res.status(503).json({
      error:
        "Live mode is not configured. OPENROUTER_API_KEY is missing on the server.",
    });
    return;
  }

  req.log.info({ model, voice, length: text.length }, "TTS cache miss");

  // In-flight dedupe so simultaneous identical requests share one upstream call
  let promise = inFlight.get(cacheKey);
  if (!promise) {
    promise = (async () => {
      let lastErr: unknown = null;
      const shortTextFallback = shouldUseShortTtsFallback(text);
      for (let attempt = 1; attempt <= MAX_TTS_AUDIO_ATTEMPTS; attempt += 1) {
        const usingFallbackInput =
          shortTextFallback && attempt === MAX_TTS_AUDIO_ATTEMPTS;
        const providerInput = usingFallbackInput
          ? buildShortTtsFallbackInput(text)
          : text;
        try {
          const response = await fetch(
            "https://openrouter.ai/api/v1/audio/speech",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                input: providerInput,
                voice,
                speed,
                response_format: "pcm",
              }),
              signal: AbortSignal.timeout(30_000),
            },
          );
          if (!response.ok) {
            let errorMessage = response.statusText;
            try {
              const errBody = (await response.json()) as {
                error?: { message?: string } | string;
              };
              if (typeof errBody.error === "string") {
                errorMessage = errBody.error;
              } else {
                errorMessage = errBody.error?.message ?? errorMessage;
              }
            } catch {
              // ignore
            }
            const err = new Error(errorMessage) as Error & { status?: number };
            err.status = response.status;
            throw err;
          }
          const upstreamContentType = response.headers.get("Content-Type");
          const arrayBuf = await response.arrayBuffer();
          const raw = Buffer.from(arrayBuf);
          if (raw.length < MIN_TTS_AUDIO_BYTES) {
            throw new Error(INVALID_TTS_AUDIO_MESSAGE);
          }
          const wav = finishTtsAudio(raw, upstreamContentType);
          assertUsableTtsAudio(wav);
          if (usingFallbackInput) {
            req.log.info(
              { model, voice, length: text.length },
              "TTS short-line fallback succeeded",
            );
          }
          await writeTtsCache(cacheKey, wav).catch((cacheErr) => {
            req.log.warn(
              { err: cacheErr, key: cacheKey, model, voice },
              "TTS cache write failed; returning fresh audio anyway",
            );
          });
          return wav;
        } catch (err) {
          lastErr = err;
          if (
            attempt >= MAX_TTS_AUDIO_ATTEMPTS ||
            !isInvalidTtsAudioError(err)
          ) {
            throw err;
          }
          req.log.warn(
            {
              err,
              attempt,
              fallbackNext:
                shortTextFallback && attempt + 1 === MAX_TTS_AUDIO_ATTEMPTS,
              model,
              voice,
              length: text.length,
            },
            "Retrying TTS provider after invalid audio response",
          );
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    })();
    inFlight.set(cacheKey, promise);
  }

  try {
    const buf = await promise;
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-TTS-Cache-Status", "MISS");
    res.setHeader("X-TTS-Cache-Source", "OPENROUTER");
    res.setHeader("X-TTS-Cache-Key", cacheKey);
    res.send(buf);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 502;
    const message = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "TTS proxy fetch failed");
    res.status(status).json({ error: message });
  } finally {
    inFlight.delete(cacheKey);
  }
});

export default router;
