import { Client } from "@replit/object-storage";
import { logger } from "./logger";

let cachedClient: Client | null = null;

function getClient(): Client {
  if (cachedClient) return cachedClient;
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  cachedClient = new Client(bucketId ? { bucketId } : {});
  return cachedClient;
}

const KEY_PREFIX = "tts-cache/";

export function ttsObjectKey(hash: string): string {
  return `${KEY_PREFIX}${hash}.mp3`;
}

export async function readTtsCache(hash: string): Promise<Buffer | null> {
  const key = ttsObjectKey(hash);
  const result = await getClient().downloadAsBytes(key);
  if (!result.ok) {
    return null;
  }
  const value = result.value as Buffer | Buffer[] | Uint8Array;
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  return Buffer.isBuffer(first) ? first : Buffer.from(first);
}

export async function writeTtsCache(hash: string, data: Buffer): Promise<void> {
  const key = ttsObjectKey(hash);
  const result = await getClient().uploadFromBytes(key, data);
  if (!result.ok) {
    logger.warn({ key, error: result.error }, "Failed to write TTS cache to object storage");
  }
}
