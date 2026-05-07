import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "./logger";

type TtsCacheProvider = "filesystem" | "none" | "replit-object-storage";

interface ReplitObjectStorageClient {
  downloadAsBytes(
    key: string,
  ): Promise<{
    ok: boolean;
    value?: Buffer | Buffer[] | Uint8Array;
    error?: unknown;
  }>;
  uploadFromBytes(
    key: string,
    data: Buffer,
  ): Promise<{ ok: boolean; error?: unknown }>;
}

let cachedReplitClient: ReplitObjectStorageClient | null = null;

const KEY_PREFIX = "tts-cache/";

export function ttsObjectKey(hash: string): string {
  return `${KEY_PREFIX}${hash}.mp3`;
}

export function getTtsCacheProvider(): TtsCacheProvider {
  const configured = process.env.TTS_CACHE_PROVIDER?.trim().toLowerCase();
  if (configured === "none" || configured === "disabled") return "none";
  if (
    configured === "filesystem" ||
    configured === "file" ||
    configured === "fs"
  ) {
    return "filesystem";
  }
  if (
    configured === "replit" ||
    configured === "object-storage" ||
    configured === "replit-object-storage"
  ) {
    return "replit-object-storage";
  }
  if (configured) {
    logger.warn(
      { provider: configured },
      "Unknown TTS_CACHE_PROVIDER; falling back to filesystem cache",
    );
  }

  if (process.env.REPL_ID || process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
    return "replit-object-storage";
  }

  return "filesystem";
}

function resolveDefaultCacheDir(): string {
  const cwd = process.cwd();
  const isApiServerCwd =
    path.basename(cwd) === "api-server" &&
    path.basename(path.dirname(cwd)) === "artifacts";
  const artifactDir = isApiServerCwd
    ? cwd
    : path.join(cwd, "artifacts", "api-server");
  return path.join(artifactDir, "output", "tts-cache");
}

function getFilesystemCacheDir(): string {
  return process.env.TTS_CACHE_DIR ?? resolveDefaultCacheDir();
}

function getFilesystemCachePath(hash: string): string {
  const safeHash = hash.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(getFilesystemCacheDir(), `${safeHash}.wav`);
}

async function getReplitClient(): Promise<ReplitObjectStorageClient> {
  if (cachedReplitClient) return cachedReplitClient;
  const packageName = "@replit/object-storage";
  const mod = (await import(packageName)) as {
    Client: new (options?: { bucketId?: string }) => ReplitObjectStorageClient;
  };
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  cachedReplitClient = new mod.Client(bucketId ? { bucketId } : {});
  return cachedReplitClient;
}

async function readReplitCache(hash: string): Promise<Buffer | null> {
  const key = ttsObjectKey(hash);
  const result = await (await getReplitClient()).downloadAsBytes(key);
  if (!result.ok) {
    return null;
  }
  const value = result.value;
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  return Buffer.isBuffer(first) ? first : Buffer.from(first);
}

async function writeReplitCache(hash: string, data: Buffer): Promise<void> {
  const key = ttsObjectKey(hash);
  const result = await (await getReplitClient()).uploadFromBytes(key, data);
  if (!result.ok) {
    logger.warn(
      { key, error: result.error },
      "Failed to write TTS cache to Replit Object Storage",
    );
  }
}

async function readFilesystemCache(hash: string): Promise<Buffer | null> {
  try {
    return await readFile(getFilesystemCachePath(hash));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn({ err, hash }, "Failed to read TTS filesystem cache");
    }
    return null;
  }
}

async function writeFilesystemCache(hash: string, data: Buffer): Promise<void> {
  const cachePath = getFilesystemCachePath(hash);
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, data);
}

export async function readTtsCache(hash: string): Promise<Buffer | null> {
  const provider = getTtsCacheProvider();
  if (provider === "none") return null;
  if (provider === "replit-object-storage") return readReplitCache(hash);
  return readFilesystemCache(hash);
}

export async function writeTtsCache(hash: string, data: Buffer): Promise<void> {
  const provider = getTtsCacheProvider();
  if (provider === "none") return;
  if (provider === "replit-object-storage") {
    await writeReplitCache(hash, data);
    return;
  }
  await writeFilesystemCache(hash, data);
}

export function resetTtsStorageForTests(): void {
  cachedReplitClient = null;
}
