import jwt from "jsonwebtoken";
import { logger } from "./logger";

const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

export interface SessionJwtPayload {
  userId: string;
  jti: string;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length === 0) {
    logger.error("SESSION_SECRET is not set; refusing to sign session tokens");
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

export function signSessionJwt(params: {
  userId: string;
  jti: string;
}): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_LIFETIME_MS;
  const token = jwt.sign(
    { userId: params.userId },
    getSecret(),
    {
      algorithm: "HS256",
      jwtid: params.jti,
      expiresIn: Math.floor(SESSION_LIFETIME_MS / 1000),
    },
  );
  return { token, expiresAt };
}

export function verifySessionJwt(token: string): SessionJwtPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ["HS256"],
    }) as { userId?: unknown; jti?: unknown };
    const userId = typeof decoded.userId === "string" ? decoded.userId : null;
    const jti = typeof decoded.jti === "string" ? decoded.jti : null;
    if (!userId || !jti) return null;
    return { userId, jti };
  } catch {
    return null;
  }
}

export const SESSION_LIFETIME_MS_CONST = SESSION_LIFETIME_MS;
