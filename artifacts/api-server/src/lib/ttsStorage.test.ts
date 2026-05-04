import { describe, it, expect, beforeEach, vi } from "vitest";

const downloadAsBytes = vi.fn();
const uploadFromBytes = vi.fn();

vi.mock("@replit/object-storage", () => {
  return {
    Client: vi.fn().mockImplementation(() => ({
      downloadAsBytes,
      uploadFromBytes,
    })),
  };
});

import {
  readTtsCache,
  ttsObjectKey,
  writeTtsCache,
} from "./ttsStorage";

describe("ttsStorage", () => {
  beforeEach(() => {
    downloadAsBytes.mockReset();
    uploadFromBytes.mockReset();
  });

  it("ttsObjectKey is deterministic and namespaced", () => {
    expect(ttsObjectKey("abc")).toBe("tts-cache/abc.mp3");
    expect(ttsObjectKey("abc")).toBe(ttsObjectKey("abc"));
    expect(ttsObjectKey("abc")).not.toBe(ttsObjectKey("xyz"));
  });

  it("readTtsCache returns null on miss", async () => {
    downloadAsBytes.mockResolvedValueOnce({ ok: false, error: { name: "missing" } });
    expect(await readTtsCache("h1")).toBeNull();
  });

  it("readTtsCache returns the cached buffer on hit", async () => {
    downloadAsBytes.mockResolvedValueOnce({
      ok: true,
      value: Buffer.from("hello"),
    });
    const buf = await readTtsCache("h1");
    expect(buf).toEqual(Buffer.from("hello"));
  });

  it("readTtsCache handles array values returned by the SDK", async () => {
    downloadAsBytes.mockResolvedValueOnce({
      ok: true,
      value: [Buffer.from("hi")],
    });
    expect(await readTtsCache("h1")).toEqual(Buffer.from("hi"));
  });

  it("writeTtsCache forwards bytes to the SDK and swallows storage errors", async () => {
    uploadFromBytes.mockResolvedValueOnce({ ok: true });
    await writeTtsCache("h1", Buffer.from("data"));
    expect(uploadFromBytes).toHaveBeenCalledWith(
      "tts-cache/h1.mp3",
      Buffer.from("data"),
    );

    uploadFromBytes.mockResolvedValueOnce({ ok: false, error: { name: "boom" } });
    await expect(
      writeTtsCache("h2", Buffer.from("d")),
    ).resolves.toBeUndefined();
  });
});
