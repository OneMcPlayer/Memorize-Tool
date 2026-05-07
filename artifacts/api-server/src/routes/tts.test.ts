import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const readTtsCache = vi.fn();
const writeTtsCache = vi.fn();

vi.mock("../lib/ttsStorage", () => ({
  getTtsCacheProvider: () => "filesystem",
  readTtsCache: (...args: unknown[]) => readTtsCache(...args),
  writeTtsCache: (...args: unknown[]) => writeTtsCache(...args),
}));

import express from "express";
import request from "supertest";
import ttsRouter from "./tts";

function makeApp() {
  const app = express();
  app.use(express.json());
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
  app.use(ttsRouter);
  return app;
}

const ACCESS = process.env.MAIN_ACCESS_TOKEN!;
const ORIGINAL_KEY = process.env.OPENROUTER_API_KEY;

describe("/tts routes", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    readTtsCache.mockReset();
    writeTtsCache.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = ORIGINAL_KEY;
  });

  it("GET /tts/health requires the access token", async () => {
    const res = await request(makeApp()).get("/tts/health");
    expect(res.status).toBe(401);
  });

  it("GET /tts/health returns the configuration when authorized", async () => {
    const res = await request(makeApp())
      .get("/tts/health")
      .set("x-access-token", ACCESS);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      provider: "openrouter",
      configured: true,
      storage: "filesystem",
    });
  });

  it("POST /tts/speech requires access token", async () => {
    const res = await request(makeApp())
      .post("/tts/speech")
      .send({ text: "hello" });
    expect(res.status).toBe(401);
  });

  it("POST /tts/speech returns 503 if OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const res = await request(makeApp())
      .post("/tts/speech")
      .set("x-access-token", ACCESS)
      .send({ text: "hello" });
    expect(res.status).toBe(503);
  });

  it("POST /tts/speech 400s on invalid body", async () => {
    const res = await request(makeApp())
      .post("/tts/speech")
      .set("x-access-token", ACCESS)
      .send({ text: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid request body/);
  });

  it("POST /tts/speech serves cached audio without calling fetch", async () => {
    readTtsCache.mockResolvedValueOnce(Buffer.from("cached-wav"));
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const res = await request(makeApp())
      .post("/tts/speech")
      .set("x-access-token", ACCESS)
      .send({ text: "hello" });
    expect(res.status).toBe(200);
    expect(res.headers["x-tts-cache-status"]).toBe("HIT");
    expect(res.headers["content-type"]).toBe("audio/wav");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POST /tts/speech calls upstream on cache miss and writes the cache", async () => {
    readTtsCache.mockResolvedValueOnce(null);
    writeTtsCache.mockResolvedValueOnce(undefined);
    const pcm = Buffer.from([1, 2, 3, 4]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(pcm, {
        status: 200,
        headers: {
          "Content-Type": "audio/pcm; rate=24000; channels=1; bits=16",
        },
      }),
    );

    const res = await request(makeApp())
      .post("/tts/speech")
      .set("x-access-token", ACCESS)
      .send({ text: "hello" });
    expect(res.status).toBe(200);
    expect(res.headers["x-tts-cache-status"]).toBe("MISS");
    expect(res.headers["content-type"]).toBe("audio/wav");
    // Body should start with the WAV "RIFF" header.
    expect(res.body.subarray(0, 4).toString()).toBe("RIFF");
    expect(writeTtsCache).toHaveBeenCalledTimes(1);
  });

  it("POST /tts/speech wraps unspecified binary PCM as playable WAV", async () => {
    readTtsCache.mockResolvedValueOnce(null);
    writeTtsCache.mockResolvedValueOnce(undefined);
    const pcm = Buffer.from([1, 2, 3, 4]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(pcm, {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      }),
    );

    const res = await request(makeApp())
      .post("/tts/speech")
      .set("x-access-token", ACCESS)
      .send({ text: "hello" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("audio/wav");
    expect(res.body.subarray(0, 4).toString()).toBe("RIFF");
    expect(res.body.subarray(8, 12).toString()).toBe("WAVE");
    expect(writeTtsCache.mock.calls[0]?.[1].subarray(0, 4).toString()).toBe(
      "RIFF",
    );
  });

  it("POST /tts/speech surfaces upstream errors", async () => {
    readTtsCache.mockResolvedValueOnce(null);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "rate limited" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await request(makeApp())
      .post("/tts/speech")
      .set("x-access-token", ACCESS)
      .send({ text: "hi" });
    expect(res.status).toBe(429);
    expect(res.body.error).toBe("rate limited");
  });
});
