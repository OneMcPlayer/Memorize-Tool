import { Router, type IRouter } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAccessToken } from "../middleware/requireAccessToken";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const DEFAULT_MODEL = "openai/whisper-large-v3";

const ALLOWED_MODELS = new Set([
  "openai/whisper-1",
  "openai/whisper-large-v3",
  "openai/gpt-4o-transcribe",
  "openai/gpt-4o-mini-transcribe",
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

function audioFormatFromMime(mimetype: string | undefined, filename: string | undefined): string {
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

router.post(
  "/audio/transcriptions",
  requireAccessToken,
  upload.single("file"),
  async (req, res): Promise<void> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      req.log.error("OPENROUTER_API_KEY is not configured");
      res.status(503).json({
        error: "Live mode is not configured. OPENROUTER_API_KEY is missing on the server.",
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
        details: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
      return;
    }
    const model = parsed.data.model ?? DEFAULT_MODEL;
    const language = parsed.data.language;
    const format = audioFormatFromMime(file.mimetype, file.originalname);
    const base64 = file.buffer.toString("base64");

    req.log.info(
      { model, language, format, sizeBytes: file.buffer.length },
      "STT proxy request",
    );

    // OpenRouter's /v1/audio/transcriptions does NOT accept the OpenAI-style
    // multipart shape for non-OpenAI-hosted models like openai/whisper-large-v3
    // — multipart uploads return HTTP 400 ("No number after minus sign in JSON
    // at position 1"). The working contract is a JSON body with the audio
    // base64-encoded under input_audio.{data,format}. Round-trip verified
    // against a real WAV. Do NOT switch this back to FormData.
    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input_audio: { data: base64, format },
          ...(language ? { language } : {}),
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err) {
      req.log.error({ err }, "STT proxy fetch failed");
      res.status(502).json({
        error: "Failed to reach OpenRouter",
        details: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errBody = (await response.json()) as { error?: { message?: string } | string };
        if (typeof errBody.error === "string") {
          errorMessage = errBody.error;
        } else {
          errorMessage = errBody.error?.message ?? errorMessage;
        }
      } catch {
        // ignore
      }
      req.log.warn({ status: response.status, message: errorMessage }, "STT upstream error");
      res.status(response.status).json({ error: errorMessage });
      return;
    }

    const data = (await response.json()) as { text?: string };
    res.json({ text: data.text ?? "" });
  },
);

export default router;
