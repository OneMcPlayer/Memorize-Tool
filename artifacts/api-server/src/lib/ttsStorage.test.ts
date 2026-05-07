import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  getTtsCacheProvider,
  readTtsCache,
  resetTtsStorageForTests,
  ttsObjectKey,
  writeTtsCache,
} from "./ttsStorage";

describe("ttsStorage", () => {
  let tempDir: string;
  const originalProvider = process.env.TTS_CACHE_PROVIDER;
  const originalCacheDir = process.env.TTS_CACHE_DIR;
  const originalReplId = process.env.REPL_ID;
  const originalBucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "tts-cache-test-"));
    process.env.TTS_CACHE_DIR = tempDir;
    delete process.env.TTS_CACHE_PROVIDER;
    delete process.env.REPL_ID;
    delete process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    downloadAsBytes.mockReset();
    uploadFromBytes.mockReset();
    resetTtsStorageForTests();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    if (originalProvider === undefined) delete process.env.TTS_CACHE_PROVIDER;
    else process.env.TTS_CACHE_PROVIDER = originalProvider;
    if (originalCacheDir === undefined) delete process.env.TTS_CACHE_DIR;
    else process.env.TTS_CACHE_DIR = originalCacheDir;
    if (originalReplId === undefined) delete process.env.REPL_ID;
    else process.env.REPL_ID = originalReplId;
    if (originalBucketId === undefined) {
      delete process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    } else {
      process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID = originalBucketId;
    }
  });

  it("ttsObjectKey is deterministic and namespaced", () => {
    expect(ttsObjectKey("abc")).toBe("tts-cache/abc.mp3");
    expect(ttsObjectKey("abc")).toBe(ttsObjectKey("abc"));
    expect(ttsObjectKey("abc")).not.toBe(ttsObjectKey("xyz"));
  });

  it("defaults to filesystem outside Replit", () => {
    expect(getTtsCacheProvider()).toBe("filesystem");
  });

  it("auto-selects Replit Object Storage when Replit env is present", () => {
    process.env.REPL_ID = "test-repl";
    expect(getTtsCacheProvider()).toBe("replit-object-storage");
  });

  it("supports disabling the cache", async () => {
    process.env.TTS_CACHE_PROVIDER = "none";
    await writeTtsCache("h1", Buffer.from("data"));
    expect(await readTtsCache("h1")).toBeNull();
  });

  it("reads and writes filesystem cache", async () => {
    process.env.TTS_CACHE_PROVIDER = "filesystem";
    await writeTtsCache("h1", Buffer.from("data"));
    expect(await readTtsCache("h1")).toEqual(Buffer.from("data"));
    expect(await readFile(path.join(tempDir, "h1.wav"))).toEqual(
      Buffer.from("data"),
    );
  });

  it("returns null on filesystem miss", async () => {
    process.env.TTS_CACHE_PROVIDER = "filesystem";
    expect(await readTtsCache("missing")).toBeNull();
  });

  it("reads and writes Replit Object Storage when configured", async () => {
    process.env.TTS_CACHE_PROVIDER = "replit";
    uploadFromBytes.mockResolvedValueOnce({ ok: true });
    downloadAsBytes.mockResolvedValueOnce({
      ok: true,
      value: Buffer.from("hello"),
    });

    await writeTtsCache("h1", Buffer.from("data"));
    expect(uploadFromBytes).toHaveBeenCalledWith(
      "tts-cache/h1.mp3",
      Buffer.from("data"),
    );
    expect(await readTtsCache("h1")).toEqual(Buffer.from("hello"));
  });

  it("handles array values returned by the Replit SDK", async () => {
    process.env.TTS_CACHE_PROVIDER = "replit";
    downloadAsBytes.mockResolvedValueOnce({
      ok: true,
      value: [Buffer.from("hi")],
    });
    expect(await readTtsCache("h1")).toEqual(Buffer.from("hi"));
  });

  it("swallows Replit storage write errors", async () => {
    process.env.TTS_CACHE_PROVIDER = "replit";
    uploadFromBytes.mockResolvedValueOnce({
      ok: false,
      error: { name: "boom" },
    });
    await expect(
      writeTtsCache("h2", Buffer.from("d")),
    ).resolves.toBeUndefined();
  });
});
