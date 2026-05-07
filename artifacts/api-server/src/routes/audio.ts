import { Router, type IRouter } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAccessToken } from "../middleware/requireAccessToken";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const DEFAULT_LIVE_STT_MODEL = "google/gemini-3.1-pro-preview";
const DEFAULT_WHISPER_STT_MODEL = "openai/whisper-large-v3";
const DEFAULT_GEMINI_STT_MODEL = "google/gemini-3.1-flash-lite-preview";
const OPENROUTER_STT_URL = "https://openrouter.ai/api/v1/audio/transcriptions";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
export const MIN_TRANSCRIPTION_AUDIO_BYTES = 1024;

const ALLOWED_MODELS = new Set([
  "openai/whisper-1",
  "openai/whisper-large-v3",
  "openai/gpt-4o-transcribe",
  "openai/gpt-4o-mini-transcribe",
  "google/gemini-3.1-pro-preview",
]);

const TranscriptionBodySchema = z.object({
  model: z
    .string()
    .min(1)
    .refine((m) => ALLOWED_MODELS.has(m), {
      message: `model must be one of: ${[...ALLOWED_MODELS].join(", ")}`,
    })
    .optional(),
  language: z
    .string()
    .regex(/^[a-zA-Z-]{2,8}$/, "language must be a BCP-47 / ISO-639 code")
    .optional(),
});

const PerformanceTargetSchema = z.enum([
  "whisper-large-v3",
  "gemini-3.1-flash",
]);

const SttPerformanceBodySchema = z.object({
  target: PerformanceTargetSchema,
  model: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9._:/-]+$/i, "model contains unsupported characters")
    .optional(),
  language: z
    .string()
    .regex(/^[a-zA-Z-]{2,8}$/, "language must be a BCP-47 / ISO-639 code")
    .optional(),
  prompt: z.string().trim().max(1500).optional(),
});

type SttPerformanceTarget = z.infer<typeof PerformanceTargetSchema>;

interface OpenRouterUsage {
  [key: string]: unknown;
}

interface OpenRouterTextResult {
  text: string;
  usage?: OpenRouterUsage;
  generationId?: string;
}

function audioFormatFromMime(
  mimetype: string | undefined,
  filename: string | undefined,
): string {
  const mt = (mimetype ?? "").split(";", 1)[0]?.trim().toLowerCase();
  switch (mt) {
    case "audio/mp4":
    case "audio/x-m4a":
    case "audio/m4a":
      return "mp4";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/wav":
    case "audio/x-wav":
    case "audio/wave":
      return "wav";
    case "audio/ogg":
      return "ogg";
    case "audio/webm":
      return "webm";
    default:
      break;
  }
  const ext = (filename ?? "").split(".").pop()?.toLowerCase();
  if (ext && ["mp3", "mp4", "m4a", "wav", "webm", "ogg"].includes(ext)) {
    return ext === "m4a" ? "mp4" : ext;
  }
  return "webm";
}

function defaultModelForTarget(target: SttPerformanceTarget): string {
  return target === "whisper-large-v3"
    ? DEFAULT_WHISPER_STT_MODEL
    : DEFAULT_GEMINI_STT_MODEL;
}

function isModelAllowedForTarget(
  target: SttPerformanceTarget,
  model: string,
): boolean {
  if (target === "whisper-large-v3") {
    return model === DEFAULT_WHISPER_STT_MODEL;
  }
  return /^google\/gemini-[a-z0-9.-]+$/i.test(model);
}

async function parseOpenRouterError(response: Response): Promise<string> {
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
  return errorMessage;
}

function objectUsage(value: unknown): OpenRouterUsage | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as OpenRouterUsage;
}

function isGeminiAudioInputModel(model: string): boolean {
  return /^google\/gemini-[a-z0-9.-]+$/i.test(model);
}

async function callOpenRouterStt(params: {
  apiKey: string;
  base64: string;
  format: string;
  language?: string;
  model: string;
}): Promise<OpenRouterTextResult> {
  const response = await fetch(OPENROUTER_STT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      input_audio: { data: params.base64, format: params.format },
      ...(params.language ? { language: params.language } : {}),
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const err = new Error(await parseOpenRouterError(response)) as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }

  const data = (await response.json()) as { text?: string; usage?: unknown };
  return {
    text: data.text ?? "",
    usage: objectUsage(data.usage),
    generationId: response.headers.get("X-Generation-Id") ?? undefined,
  };
}

function textFromOpenRouterChatResponse(data: unknown): string {
  const choice = (data as { choices?: unknown[] })?.choices?.[0] as
    | { message?: { content?: unknown } }
    | undefined;
  const content = choice?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

async function callOpenRouterGeminiAudioChat(params: {
  apiKey: string;
  base64: string;
  format: string;
  language?: string;
  model: string;
  prompt?: string;
}): Promise<OpenRouterTextResult> {
  const prompt =
    params.prompt ||
    [
      "Transcribe the spoken words in this audio exactly.",
      params.language
        ? `The expected language is ${params.language}.`
        : "Detect the spoken language automatically.",
      "Return only the transcript text, with no summary or commentary.",
    ].join(" ");

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "input_audio",
              input_audio: {
                data: params.base64,
                format: params.format,
              },
            },
          ],
        },
      ],
      stream: false,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const err = new Error(await parseOpenRouterError(response)) as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }

  const data = (await response.json()) as { usage?: unknown };
  return {
    text: textFromOpenRouterChatResponse(data),
    usage: objectUsage(data.usage),
    generationId: response.headers.get("X-Generation-Id") ?? undefined,
  };
}

router.post(
  "/audio/transcriptions",
  requireAccessToken,
  upload.single("file"),
  async (req, res): Promise<void> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      req.log.error("OPENROUTER_API_KEY is not configured");
      res.status(503).json({
        error:
          "Live mode is not configured. OPENROUTER_API_KEY is missing on the server.",
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Audio file is required" });
      return;
    }

    const parsed = TranscriptionBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request body",
        details: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      });
      return;
    }
    const model = parsed.data.model ?? DEFAULT_LIVE_STT_MODEL;
    const language = parsed.data.language;

    if (file.buffer.length < MIN_TRANSCRIPTION_AUDIO_BYTES) {
      req.log.warn(
        { sizeBytes: file.buffer.length },
        "STT proxy rejected tiny audio payload",
      );
      res.status(400).json({
        error: "Audio file is too short or empty. Please record again.",
      });
      return;
    }

    const format = audioFormatFromMime(file.mimetype, file.originalname);
    const base64 = file.buffer.toString("base64");

    req.log.info(
      { model, language, format, sizeBytes: file.buffer.length },
      "STT proxy request",
    );

    try {
      const result = isGeminiAudioInputModel(model)
        ? await callOpenRouterGeminiAudioChat({
            apiKey,
            base64,
            format,
            language,
            model,
          })
        : await callOpenRouterStt({
            apiKey,
            base64,
            format,
            language,
            model,
          });
      res.json({ text: result.text });
    } catch (err) {
      const status = (err as { status?: number }).status ?? 502;
      const message = err instanceof Error ? err.message : String(err);
      req.log.error({ err, model }, "STT proxy fetch failed");
      res.status(status).json({
        error: status === 502 ? "Failed to reach OpenRouter" : message,
        details: status === 502 ? message : undefined,
      });
    }
  },
);

router.get(
  "/audio/stt-performance/models",
  requireAccessToken,
  (_req, res): void => {
    res.json({
      configured: Boolean(process.env.OPENROUTER_API_KEY),
      targets: [
        {
          id: "whisper-large-v3",
          label: "Whisper large-v3",
          defaultModel: DEFAULT_WHISPER_STT_MODEL,
          endpoint: "OpenRouter STT",
        },
        {
          id: "gemini-3.1-flash",
          label: "Gemini 3.1 Flash",
          defaultModel: DEFAULT_GEMINI_STT_MODEL,
          endpoint: "OpenRouter audio input",
        },
      ],
    });
  },
);

router.post(
  "/audio/stt-performance",
  requireAccessToken,
  upload.single("file"),
  async (req, res): Promise<void> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      req.log.error("OPENROUTER_API_KEY is not configured");
      res.status(503).json({
        error:
          "Live STT comparison is not configured. OPENROUTER_API_KEY is missing on the server.",
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Audio file is required" });
      return;
    }

    const parsed = SttPerformanceBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request body",
        details: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      });
      return;
    }

    if (file.buffer.length < MIN_TRANSCRIPTION_AUDIO_BYTES) {
      req.log.warn(
        { sizeBytes: file.buffer.length },
        "STT performance test rejected tiny audio payload",
      );
      res.status(400).json({
        error: "Audio file is too short or empty. Please record again.",
      });
      return;
    }

    const target = parsed.data.target;
    const model = parsed.data.model || defaultModelForTarget(target);
    if (!isModelAllowedForTarget(target, model)) {
      res.status(400).json({
        error:
          target === "whisper-large-v3"
            ? "Whisper target only supports openai/whisper-large-v3."
            : "Gemini target only supports google/gemini-* model ids.",
      });
      return;
    }

    const format = audioFormatFromMime(file.mimetype, file.originalname);
    const base64 = file.buffer.toString("base64");
    const startedAt = Date.now();

    req.log.info(
      {
        target,
        model,
        language: parsed.data.language,
        format,
        sizeBytes: file.buffer.length,
      },
      "STT performance request",
    );

    try {
      const result =
        target === "whisper-large-v3"
          ? await callOpenRouterStt({
              apiKey,
              base64,
              format,
              language: parsed.data.language,
              model,
            })
          : await callOpenRouterGeminiAudioChat({
              apiKey,
              base64,
              format,
              language: parsed.data.language,
              model,
              prompt: parsed.data.prompt,
            });

      res.json({
        target,
        model,
        endpoint:
          target === "whisper-large-v3"
            ? "openrouter-audio-transcriptions"
            : "openrouter-chat-audio-input",
        text: result.text,
        usage: result.usage,
        generationId: result.generationId,
        durationMs: Date.now() - startedAt,
        input: {
          format,
          mimeType: file.mimetype,
          sizeBytes: file.buffer.length,
        },
      });
    } catch (err) {
      const status = (err as { status?: number }).status ?? 502;
      const message = err instanceof Error ? err.message : String(err);
      req.log.error({ err, target, model }, "STT performance provider failed");
      res.status(status).json({
        error: status === 502 ? "Failed to reach OpenRouter" : message,
        details: status === 502 ? message : undefined,
      });
    }
  },
);

export default router;
