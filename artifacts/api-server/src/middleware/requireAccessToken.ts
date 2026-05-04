import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { logger } from "../lib/logger";

const ACCESS_TOKEN_HEADER = "x-access-token";
const ALLOWLIST = new Set<string>(["/healthz"]);

let cachedExpected: string | null = null;
let cachedExpectedBuf: Buffer | null = null;

function getExpectedToken(): { token: string; buf: Buffer } | null {
  const value = process.env.MAIN_ACCESS_TOKEN;
  if (!value) return null;
  if (value !== cachedExpected) {
    cachedExpected = value;
    cachedExpectedBuf = Buffer.from(value, "utf8");
  }
  return { token: cachedExpected, buf: cachedExpectedBuf! };
}

export function assertAccessTokenConfigured(): void {
  if (!process.env.MAIN_ACCESS_TOKEN) {
    logger.error(
      "MAIN_ACCESS_TOKEN is not set; refusing to start. Configure it as a secret before running the server.",
    );
    throw new Error("MAIN_ACCESS_TOKEN is not configured");
  }
}

function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    // Still run a comparison to keep timing roughly constant.
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function requireAccessToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // The middleware is mounted on `/api`, so req.path is the sub-path
  // (e.g. `/healthz`, `/passkey/login`).
  if (req.method === "GET" && ALLOWLIST.has(req.path)) {
    next();
    return;
  }

  const expected = getExpectedToken();
  if (!expected) {
    logger.error("MAIN_ACCESS_TOKEN is not configured at request time");
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  const raw = req.headers[ACCESS_TOKEN_HEADER];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (!provided || typeof provided !== "string") {
    res.status(401).json({ error: "invalid_access_token" });
    return;
  }

  const providedBuf = Buffer.from(provided, "utf8");
  if (!constantTimeEqual(providedBuf, expected.buf)) {
    res.status(401).json({ error: "invalid_access_token" });
    return;
  }

  next();
}
