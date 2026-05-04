import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import audioRouter from "./audio";

function makeApp() {
  const app = express();
  app.use((req, _res, next) => {
    (req as unknown as { log: { info: () => void; warn: () => void; error: () => void } }).log = {
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
      .attach("file", Buffer.from("xx"), { filename: "a.wav", contentType: "audio/wav" });
    expect(res.status).toBe(401);
  });

  it("returns 503 when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS)
      .attach("file", Buffer.from("xx"), { filename: "a.wav", contentType: "audio/wav" });
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
      .attach("file", Buffer.from("xx"), { filename: "a.wav", contentType: "audio/wav" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid request body/);
  });

  it("forwards the audio to OpenRouter and returns the text on success", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ text: "hello world" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS)
      .field("language", "en")
      .attach("file", Buffer.from("audiodata"), {
        filename: "a.wav",
        contentType: "audio/wav",
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: "hello world" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/audio/transcriptions",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.input_audio.format).toBe("wav");
    expect(body.language).toBe("en");
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
      .attach("file", Buffer.from("xx"), { filename: "a.wav", contentType: "audio/wav" });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe("nope");
  });

  it("returns 502 when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const res = await request(makeApp())
      .post("/audio/transcriptions")
      .set("x-access-token", ACCESS)
      .attach("file", Buffer.from("xx"), { filename: "a.wav", contentType: "audio/wav" });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Failed to reach OpenRouter/);
  });
});
