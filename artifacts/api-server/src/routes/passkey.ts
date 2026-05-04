import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { and, eq, gt, lte } from "drizzle-orm";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import {
  db,
  usersTable,
  passkeysTable,
  tokensTable,
  webauthnChallengesTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { signSessionJwt, verifySessionJwt } from "../lib/sessionJwt";

const router: IRouter = Router();

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
const CHALLENGE_LIFETIME_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateRequests = new Map<string, { count: number; ts: number }>();

const RP_NAME = "Memorize Tool";

function getRpId(req: Request): string {
  const envOverride = process.env.WEBAUTHN_RP_ID;
  if (envOverride) return envOverride;
  const host = req.get("host") ?? "";
  return host.split(":")[0] || "localhost";
}

function getExpectedOrigin(req: Request): string {
  const envOverride = process.env.WEBAUTHN_ORIGIN;
  if (envOverride) return envOverride;
  const origin = req.get("origin");
  if (origin) return origin;
  const host = req.get("host") ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
  return `${proto}://${host}`;
}

function rateLimit(req: Request, res: Response): boolean {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const entry = rateRequests.get(ip);
  if (!entry || now - entry.ts > RATE_LIMIT_WINDOW_MS) {
    rateRequests.set(ip, { count: 1, ts: now });
    return true;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    res.status(429).json({ error: "Too many requests, please try again later." });
    return false;
  }
  return true;
}

function newId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function b64urlToBuffer(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function bufferToB64url(buf: Buffer | Uint8Array): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createSessionToken(userId: string) {
  const jti = newId();
  const now = new Date();
  const { token, expiresAt } = signSessionJwt({ userId, jti });
  // Persist the jti so logout/refresh can revoke it; the token itself is a JWT
  // signed with SESSION_SECRET and is not stored.
  await db.insert(tokensTable).values({
    id: jti,
    userId,
    token: jti,
    createdAt: now,
    expiresAt: new Date(expiresAt),
  });
  return { id: jti, token, expiresAt };
}

async function storeChallenge(params: {
  challenge: string;
  kind: "register" | "authenticate";
  username?: string | null;
  userId?: string | null;
}) {
  const id = newId();
  const now = new Date();
  await db.insert(webauthnChallengesTable).values({
    id,
    challenge: params.challenge,
    kind: params.kind,
    username: params.username ?? null,
    userId: params.userId ?? null,
    createdAt: now,
    expiresAt: new Date(now.getTime() + CHALLENGE_LIFETIME_MS),
  });
}

async function consumeChallenge(params: {
  challenge: string;
  kind: "register" | "authenticate";
  username?: string;
}): Promise<boolean> {
  const now = new Date();
  const filters = [
    eq(webauthnChallengesTable.challenge, params.challenge),
    eq(webauthnChallengesTable.kind, params.kind),
    gt(webauthnChallengesTable.expiresAt, now),
  ];
  if (typeof params.username === "string") {
    filters.push(eq(webauthnChallengesTable.username, params.username));
  }
  const rows = await db
    .delete(webauthnChallengesTable)
    .where(and(...filters))
    .returning({ id: webauthnChallengesTable.id });
  return rows.length > 0;
}

function extractChallengeFromClientData(clientDataJSON: string): string | null {
  try {
    const buf = b64urlToBuffer(clientDataJSON);
    const parsed = JSON.parse(buf.toString("utf8")) as { challenge?: unknown };
    return typeof parsed.challenge === "string" ? parsed.challenge : null;
  } catch {
    return null;
  }
}

router.get("/passkey/supported", (_req, res): void => {
  res.json({ supported: true, message: "Passkeys are supported on the server" });
});

router.post("/passkey/register/options", async (req, res): Promise<void> => {
  if (!rateLimit(req, res)) return;

  const { username } = (req.body ?? {}) as { username?: unknown };
  if (typeof username !== "string" || username.trim().length === 0) {
    res.status(400).json({ error: "Username is required" });
    return;
  }
  const trimmedUsername = username.trim();

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, trimmedUsername));

  if (existingUser) {
    res.status(409).json({ error: "Username already registered" });
    return;
  }

  const userIdBuf = crypto.randomBytes(16);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(req),
    userID: userIdBuf,
    userName: trimmedUsername,
    userDisplayName: trimmedUsername,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
    supportedAlgorithmIDs: [-7, -257],
  });

  await storeChallenge({
    challenge: options.challenge,
    kind: "register",
    username: trimmedUsername,
  });

  req.log.info({ username: trimmedUsername }, "Passkey registration options issued");
  res.json(options);
});

router.post("/passkey/register/verify", async (req, res): Promise<void> => {
  if (!rateLimit(req, res)) return;

  const { username, response } = (req.body ?? {}) as {
    username?: unknown;
    response?: unknown;
  };
  if (typeof username !== "string" || username.trim().length === 0) {
    res.status(400).json({ error: "Username is required" });
    return;
  }
  if (!response || typeof response !== "object") {
    res.status(400).json({ error: "Missing registration response" });
    return;
  }

  const trimmedUsername = username.trim();
  const regResponse = response as RegistrationResponseJSON;

  // Bind to the exact ceremony: extract the challenge the client signed and atomically consume it.
  const ceremonyChallenge = extractChallengeFromClientData(regResponse.response.clientDataJSON);
  if (!ceremonyChallenge) {
    res.status(400).json({ error: "Invalid clientDataJSON" });
    return;
  }
  const consumed = await consumeChallenge({
    challenge: ceremonyChallenge,
    kind: "register",
    username: trimmedUsername,
  });
  if (!consumed) {
    res
      .status(400)
      .json({ error: "No matching pending registration challenge" });
    return;
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: regResponse,
      expectedChallenge: ceremonyChallenge,
      expectedOrigin: getExpectedOrigin(req),
      expectedRPID: getRpId(req),
      requireUserVerification: true,
    });
  } catch (err) {
    req.log.warn({ err }, "Registration verification threw");
    res.status(400).json({ error: err instanceof Error ? err.message : "Verification failed" });
    return;
  }

  if (!verification.verified || !verification.registrationInfo) {
    res.status(400).json({ error: "Registration not verified" });
    return;
  }

  const credential = verification.registrationInfo.credential;

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, trimmedUsername));

  if (existingUser) {
    res.status(409).json({ error: "Username already registered" });
    return;
  }

  const userId = newId();
  await db.insert(usersTable).values({ id: userId, username: trimmedUsername });

  await db.insert(passkeysTable).values({
    id: credential.id,
    userId,
    publicKey: bufferToB64url(credential.publicKey),
    counter: credential.counter,
    transports: regResponse.response.transports as string[] | undefined,
  });

  const tokenData = await createSessionToken(userId);

  req.log.info({ username: trimmedUsername, userId }, "Passkey registered and authenticated");
  res.json({
    success: true,
    message: "Passkey registered successfully",
    userId,
    user: { id: userId, username: trimmedUsername, email: null },
    token: tokenData.token,
    expiresAt: tokenData.expiresAt,
  });
});

router.post("/passkey/authenticate/options", async (req, res): Promise<void> => {
  if (!rateLimit(req, res)) return;

  const options = await generateAuthenticationOptions({
    rpID: getRpId(req),
    userVerification: "required",
  });

  await storeChallenge({ challenge: options.challenge, kind: "authenticate" });

  res.json(options);
});

router.post("/passkey/authenticate/verify", async (req, res): Promise<void> => {
  if (!rateLimit(req, res)) return;

  const { response } = (req.body ?? {}) as { response?: unknown };
  if (!response || typeof response !== "object") {
    res.status(400).json({ error: "Missing authentication response" });
    return;
  }
  const authResponse = response as AuthenticationResponseJSON;
  const credentialId = authResponse.id;
  if (!credentialId || typeof credentialId !== "string") {
    res.status(400).json({ error: "Invalid credential id" });
    return;
  }

  const [passkey] = await db
    .select()
    .from(passkeysTable)
    .where(eq(passkeysTable.id, credentialId));
  if (!passkey) {
    res.status(401).json({ error: "Unknown credential" });
    return;
  }

  // Bind to the exact ceremony: extract the challenge the client signed and atomically consume it.
  const ceremonyChallenge = extractChallengeFromClientData(authResponse.response.clientDataJSON);
  if (!ceremonyChallenge) {
    res.status(400).json({ error: "Invalid clientDataJSON" });
    return;
  }
  const consumed = await consumeChallenge({
    challenge: ceremonyChallenge,
    kind: "authenticate",
  });
  if (!consumed) {
    res
      .status(400)
      .json({ error: "No matching pending authentication challenge" });
    return;
  }

  const credential: WebAuthnCredential = {
    id: passkey.id,
    publicKey: new Uint8Array(b64urlToBuffer(passkey.publicKey)),
    counter: passkey.counter,
    transports: passkey.transports as AuthenticatorTransportFuture[] | undefined,
  };

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: ceremonyChallenge,
      expectedOrigin: getExpectedOrigin(req),
      expectedRPID: getRpId(req),
      credential,
      requireUserVerification: true,
    });
  } catch (err) {
    req.log.warn({ err }, "Authentication verification threw");
    res.status(401).json({ error: err instanceof Error ? err.message : "Verification failed" });
    return;
  }

  if (!verification.verified) {
    res.status(401).json({ error: "Authentication not verified" });
    return;
  }

  const newCounter = verification.authenticationInfo.newCounter;
  const lastUsed = new Date();
  await db
    .update(passkeysTable)
    .set({ counter: newCounter, lastUsed })
    .where(eq(passkeysTable.id, passkey.id));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, passkey.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  await db.update(usersTable).set({ lastLogin: lastUsed }).where(eq(usersTable.id, user.id));

  const tokenData = await createSessionToken(user.id);

  req.log.info({ userId: user.id, username: user.username }, "User authenticated via passkey");
  res.json({
    success: true,
    message: "Authentication successful",
    user: { id: user.id, username: user.username, email: user.email },
    token: tokenData.token,
    expiresAt: tokenData.expiresAt,
  });
});

router.post("/passkey/refresh", async (req, res): Promise<void> => {
  if (!rateLimit(req, res)) return;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Empty token" });
    return;
  }

  const payload = verifySessionJwt(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const now = new Date();
  // Atomically consume the old token: the DELETE is the authorization decision.
  // Only the first concurrent request to delete this jti row proceeds; any
  // duplicate racing request gets zero rows back and is rejected.
  const [deletedToken] = await db
    .delete(tokensTable)
    .where(and(eq(tokensTable.id, payload.jti), gt(tokensTable.expiresAt, now)))
    .returning();
  if (!deletedToken) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const newTokenData = await createSessionToken(user.id);

  req.log.info({ userId: user.id }, "Token refreshed");
  res.json({
    success: true,
    message: "Token refreshed successfully",
    token: newTokenData.token,
    expiresAt: newTokenData.expiresAt,
  });
});

export async function revokeSessionByAuthHeader(
  authHeader: string | undefined,
): Promise<{ ok: boolean; alreadyLoggedOut: boolean; status?: number; error?: string }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, alreadyLoggedOut: false, status: 400, error: "Missing or invalid authorization header" };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { ok: false, alreadyLoggedOut: false, status: 400, error: "Empty token" };
  }
  const payload = verifySessionJwt(token);
  if (!payload) {
    // Token already invalid — treat as logged out.
    return { ok: true, alreadyLoggedOut: true };
  }
  const result = await db
    .delete(tokensTable)
    .where(eq(tokensTable.id, payload.jti))
    .returning({ id: tokensTable.id });
  return { ok: true, alreadyLoggedOut: result.length === 0 };
}

router.get("/passkey/count", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const payload = verifySessionJwt(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  const now = new Date();
  const [tokenRow] = await db
    .select()
    .from(tokensTable)
    .where(and(eq(tokensTable.id, payload.jti), gt(tokensTable.expiresAt, now)));
  if (!tokenRow) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  const rows = await db
    .select({ id: passkeysTable.id })
    .from(passkeysTable)
    .where(eq(passkeysTable.userId, payload.userId));
  res.json({ count: rows.length });
});

router.post("/passkey/logout", async (req, res): Promise<void> => {
  const r = await revokeSessionByAuthHeader(req.headers.authorization);
  if (!r.ok) {
    res.status(r.status ?? 400).json({ error: r.error ?? "Logout failed" });
    return;
  }
  res.json({
    success: true,
    message: r.alreadyLoggedOut ? "Already logged out" : "Logged out successfully",
  });
});

setInterval(() => {
  const now = new Date();
  db.delete(tokensTable)
    .where(lte(tokensTable.expiresAt, now))
    .returning({ id: tokensTable.id })
    .then((rows) => {
      if (rows.length > 0) {
        logger.info({ deleted: rows.length }, "Cleaned up expired tokens");
      }
    })
    .catch((err) => {
      logger.error({ err }, "Failed to clean up expired tokens");
    });
  db.delete(webauthnChallengesTable)
    .where(lte(webauthnChallengesTable.expiresAt, now))
    .returning({ id: webauthnChallengesTable.id })
    .then((rows) => {
      if (rows.length > 0) {
        logger.info({ deleted: rows.length }, "Cleaned up expired WebAuthn challenges");
      }
    })
    .catch((err) => {
      logger.error({ err }, "Failed to clean up expired WebAuthn challenges");
    });
}, 60 * 60 * 1000);

export default router;
