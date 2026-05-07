import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import audioRouter from "./audio";

function makeApp() {
  const app = express();
  app.use((req, _res, next) => {
    (
      req as unknown as {
        log: { info: () => void; warn: () => void; error: () => void };
      }
    ).log = {
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    next();
  });
  app.use(audioRouter);
  return app;
}

const ACCESS = process.env.MAIN_ACCESS_TOKEN!;
const ORIGINAL_KEY = process.env.OPENROUTER_API_KEY;
const VALID_AUDIO = Buffer.alloc(2048, 1);

describe("POST /audio/transcriptions", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = ORIGINAL_KEY;
  });

  it("requires the access token", async () => {
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .attach("file", Buffer.from("xx"), {
        filename: "a.wav",
        contentType: "audio/wav",
      });
    expect(res.status).toBe(401);
  });

  it("returns 503 when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS)
      .attach("file", Buffer.from("xx"), {
        filename: "a.wav",
        contentType: "audio/wav",
      });
    expect(res.status).toBe(503);
  });

  it("returns 400 when no file is uploaded", async () => {
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Audio file is required/);
  });

  it("returns 400 on invalid model", async () => {
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS)
      .field("model", "not-a-real-model")
      .attach("file", Buffer.from("xx"), {
        filename: "a.wav",
        contentType: "audio/wav",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid request body/);
  });

  it("uses Gemini 3.1 Pro for live transcription by default", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "hello from gemini pro" } }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS)
      .field("language", "en")
      .attach("file", VALID_AUDIO, {
        filename: "a.wav",
        contentType: "audio/wav",
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: "hello from gemini pro" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(body.model).toBe("google/gemini-3.1-pro-preview");
    expect(body.messages[0].content[0].text).toContain(
      "The expected language is en.",
    );
    expect(body.messages[0].content[1]).toMatchObject({
      type: "input_audio",
      input_audio: { format: "wav" },
    });
  });

  it("can still route explicit Whisper models through OpenRouter STT", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ text: "hello from whisper" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS)
      .field("language", "en")
      .field("model", "openai/whisper-large-v3")
      .attach("file", VALID_AUDIO, {
        filename: "a.wav",
        contentType: "audio/wav",
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: "hello from whisper" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/audio/transcriptions",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(body).toMatchObject({
      model: "openai/whisper-large-v3",
      language: "en",
      input_audio: { format: "wav" },
    });
  });

  it("rejects tiny audio before calling OpenRouter", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ text: "should not be used" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS)
      .attach("file", Buffer.from("tiny"), {
        filename: "a.wav",
        contentType: "audio/wav",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too short or empty/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates upstream errors from OpenRouter", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "nope" } }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS)
      .attach("file", VALID_AUDIO, {
        filename: "a.wav",
        contentType: "audio/wav",
      });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe("nope");
  });

  it("returns 502 when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS)
      .attach("file", VALID_AUDIO, {
        filename: "a.wav",
        contentType: "audio/wav",
      });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Failed to reach OpenRouter/);
  });
});

describe("POST /audio/stt-performance", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = ORIGINAL_KEY;
  });

  it("lists the comparison targets", async () => {
    const res = await request(makeApp())
      .get("/audio/stt-performance/models")
      .set("x-access-token", ACCESS);
    expect(res.status).toBe(200);
    expect(res.body.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "whisper-large-v3",
          defaultModel: "openai/whisper-large-v3",
        }),
        expect.objectContaining({
          id: "gemini-3.1-flash",
          defaultModel: "google/gemini-3.1-flash-lite-preview",
        }),
      ]),
    );
  });

  it("runs Whisper through OpenRouter's STT endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          text: "whisper transcript",
          usage: { seconds: 1.4, cost: 0.001 },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Generation-Id": "gen-whisper",
          },
        },
      ),
    );

    const res = await request(makeApp())
      .post("/audio/stt-performance")
      .set("x-access-token", ACCESS)
      .field("target", "whisper-large-v3")
      .field("language", "en")
      .attach("file", VALID_AUDIO, {
        filename: "sample.wav",
        contentType: "audio/wav",
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      target: "whisper-large-v3",
      model: "openai/whisper-large-v3",
      endpoint: "openrouter-audio-transcriptions",
      text: "whisper transcript",
      generationId: "gen-whisper",
      usage: { seconds: 1.4, cost: 0.001 },
      input: { format: "wav", sizeBytes: VALID_AUDIO.length },
    });
    expect(typeof res.body.durationMs).toBe("number");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/audio/transcriptions",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(body).toMatchObject({
      model: "openai/whisper-large-v3",
      language: "en",
      input_audio: { format: "wav" },
    });
  });

  it("runs Gemini through OpenRouter's audio-input chat endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "gemini transcript" } }],
          usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Generation-Id": "gen-gemini",
          },
        },
      ),
    );

    const res = await request(makeApp())
      .post("/audio/stt-performance")
      .set("x-access-token", ACCESS)
      .field("target", "gemini-3.1-flash")
      .field("model", "google/gemini-3.1-flash-preview")
      .field("prompt", "Transcribe only.")
      .attach("file", VALID_AUDIO, {
        filename: "sample.webm",
        contentType: "audio/webm",
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      target: "gemini-3.1-flash",
      model: "google/gemini-3.1-flash-preview",
      endpoint: "openrouter-chat-audio-input",
      text: "gemini transcript",
      generationId: "gen-gemini",
      input: { format: "webm", sizeBytes: VALID_AUDIO.length },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(body.model).toBe("google/gemini-3.1-flash-preview");
    expect(body.messages[0].content[0]).toEqual({
      type: "text",
      text: "Transcribe only.",
    });
    expect(body.messages[0].content[1]).toMatchObject({
      type: "input_audio",
      input_audio: { format: "webm" },
    });
  });

  it("rejects a Gemini model id for the Whisper target", async () => {
    const res = await request(makeApp())
      .post("/audio/stt-performance")
      .set("x-access-token", ACCESS)
      .field("target", "whisper-large-v3")
      .field("model", "google/gemini-3.1-flash-lite-preview")
      .attach("file", VALID_AUDIO, {
        filename: "sample.wav",
        contentType: "audio/wav",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Whisper target/);
  });

  it("rejects tiny audio before the comparison request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ text: "should not be used" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await request(makeApp())
      .post("/audio/stt-performance")
      .set("x-access-token", ACCESS)
      .field("target", "gemini-3.1-flash")
      .attach("file", Buffer.from("tiny"), {
        filename: "sample.wav",
        contentType: "audio/wav",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too short or empty/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
