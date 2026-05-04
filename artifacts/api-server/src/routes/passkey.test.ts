import { describe, it, expect, beforeEach, vi } from "vitest";

const TABLES = vi.hoisted(() => ({
  users: { __t: "users" as const },
  passkeys: { __t: "passkeys" as const },
  tokens: { __t: "tokens" as const },
  challenges: { __t: "challenges" as const },
}));

const dbState: {
  users: Array<Record<string, unknown>>;
  passkeys: Array<Record<string, unknown>>;
  tokens: Array<Record<string, unknown>>;
  challenges: Array<Record<string, unknown>>;
} = { users: [], passkeys: [], tokens: [], challenges: [] };

function tableKey(t: unknown): keyof typeof dbState | null {
  if (t === TABLES.users) return "users";
  if (t === TABLES.passkeys) return "passkeys";
  if (t === TABLES.tokens) return "tokens";
  if (t === TABLES.challenges) return "challenges";
  return null;
}

vi.mock("@workspace/db", () => {
  const select = vi.fn(() => ({
    from: (table: unknown) => ({
      where: async () => {
        const key = tableKey(table);
        if (!key) return [];
        return [...dbState[key]];
      },
    }),
  }));
  const insert = vi.fn((table: unknown) => ({
    values: async (v: Record<string, unknown> | Array<Record<string, unknown>>) => {
      const key = tableKey(table);
      if (!key) return;
      const rows = Array.isArray(v) ? v : [v];
      dbState[key].push(...rows);
    },
  }));
  const del = vi.fn((table: unknown) => ({
    where: () => ({
      returning: async (_proj?: unknown) => {
        const key = tableKey(table);
        if (!key) return [];
        const removed = dbState[key];
        dbState[key] = [];
        return removed;
      },
    }),
  }));
  const update = vi.fn((table: unknown) => ({
    set: (patch: Record<string, unknown>) => ({
      where: async () => {
        const key = tableKey(table);
        if (!key) return;
        dbState[key] = dbState[key].map((row) => ({ ...row, ...patch }));
      },
    }),
  }));
  return {
    db: { select, insert, delete: del, update },
    usersTable: TABLES.users,
    passkeysTable: TABLES.passkeys,
    tokensTable: TABLES.tokens,
    webauthnChallengesTable: TABLES.challenges,
  };
});

const generateRegistrationOptions = vi.fn();
const verifyRegistrationResponse = vi.fn();
const generateAuthenticationOptions = vi.fn();
const verifyAuthenticationResponse = vi.fn();

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: (...a: unknown[]) => generateRegistrationOptions(...a),
  verifyRegistrationResponse: (...a: unknown[]) => verifyRegistrationResponse(...a),
  generateAuthenticationOptions: (...a: unknown[]) => generateAuthenticationOptions(...a),
  verifyAuthenticationResponse: (...a: unknown[]) => verifyAuthenticationResponse(...a),
}));

const signSessionJwt = vi.fn();
const verifySessionJwt = vi.fn();

vi.mock("../lib/sessionJwt", () => ({
  signSessionJwt: (...a: unknown[]) => signSessionJwt(...a),
  verifySessionJwt: (...a: unknown[]) => verifySessionJwt(...a),
}));

import express from "express";
import request from "supertest";
import passkeyRouter from "./passkey";

let ipCounter = 0;

function makeApp() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.use((req, _res, next) => {
    ipCounter += 1;
    Object.defineProperty(req, "ip", {
      value: `10.0.0.${ipCounter % 250}`,
      configurable: true,
    });
    (req as unknown as { log: { info: () => void; warn: () => void; error: () => void } }).log = {
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    next();
  });
  app.use(passkeyRouter);
  return app;
}

function b64url(str: string): string {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

beforeEach(() => {
  dbState.users = [];
  dbState.passkeys = [];
  dbState.tokens = [];
  dbState.challenges = [];
  generateRegistrationOptions.mockReset();
  verifyRegistrationResponse.mockReset();
  generateAuthenticationOptions.mockReset();
  verifyAuthenticationResponse.mockReset();
  signSessionJwt.mockReset();
  verifySessionJwt.mockReset();
  signSessionJwt.mockReturnValue({ token: "session-jwt", expiresAt: Date.now() + 1000 });
});

describe("GET /passkey/supported", () => {
  it("always returns supported=true", async () => {
    const res = await request(makeApp()).get("/passkey/supported");
    expect(res.status).toBe(200);
    expect(res.body.supported).toBe(true);
  });
});

describe("POST /passkey/register/options", () => {
  it("400s when username is missing", async () => {
    const res = await request(makeApp())
      .post("/passkey/register/options")
      .send({});
    expect(res.status).toBe(400);
  });

  it("409s when the username already exists", async () => {
    dbState.users.push({ id: "u1", username: "alice" });
    const res = await request(makeApp())
      .post("/passkey/register/options")
      .send({ username: "alice" });
    expect(res.status).toBe(409);
  });

  it("returns the generated options and stores a challenge row", async () => {
    generateRegistrationOptions.mockResolvedValueOnce({ challenge: "chal-1", rp: { name: "x" } });
    const res = await request(makeApp())
      .post("/passkey/register/options")
      .send({ username: "alice" });
    expect(res.status).toBe(200);
    expect(res.body.challenge).toBe("chal-1");
    expect(dbState.challenges).toHaveLength(1);
    expect(dbState.challenges[0]).toMatchObject({
      challenge: "chal-1",
      kind: "register",
      username: "alice",
    });
  });
});

describe("POST /passkey/register/verify", () => {
  it("400s when username is missing", async () => {
    const res = await request(makeApp())
      .post("/passkey/register/verify")
      .send({ response: {} });
    expect(res.status).toBe(400);
  });

  it("400s when response is missing", async () => {
    const res = await request(makeApp())
      .post("/passkey/register/verify")
      .send({ username: "alice" });
    expect(res.status).toBe(400);
  });

  it("400s when clientDataJSON cannot be parsed", async () => {
    const res = await request(makeApp())
      .post("/passkey/register/verify")
      .send({
        username: "alice",
        response: { response: { clientDataJSON: "!!!not-base64!!!" } },
      });
    expect(res.status).toBe(400);
  });

  it("registers a new user on a successful verification", async () => {
    const challenge = "chal-1";
    dbState.challenges.push({
      id: "c1",
      challenge,
      kind: "register",
      username: "alice",
      expiresAt: new Date(Date.now() + 60_000),
    });
    verifyRegistrationResponse.mockResolvedValueOnce({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-1",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
        },
      },
    });
    const clientDataJSON = b64url(JSON.stringify({ challenge }));
    const res = await request(makeApp())
      .post("/passkey/register/verify")
      .send({
        username: "alice",
        response: {
          response: { clientDataJSON, transports: ["internal"] },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe("alice");
    expect(res.body.token).toBe("session-jwt");
    expect(dbState.users).toHaveLength(1);
    expect(dbState.passkeys).toHaveLength(1);
    expect(dbState.tokens).toHaveLength(1);
  });
});

describe("POST /passkey/authenticate/options", () => {
  it("returns generated authentication options and persists the challenge", async () => {
    generateAuthenticationOptions.mockResolvedValueOnce({ challenge: "auth-chal" });
    const res = await request(makeApp())
      .post("/passkey/authenticate/options")
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.challenge).toBe("auth-chal");
    expect(dbState.challenges[0]).toMatchObject({
      challenge: "auth-chal",
      kind: "authenticate",
    });
  });
});

describe("POST /passkey/authenticate/verify", () => {
  it("400s when response is missing", async () => {
    const res = await request(makeApp())
      .post("/passkey/authenticate/verify")
      .send({});
    expect(res.status).toBe(400);
  });

  it("400s when credential id is missing", async () => {
    const res = await request(makeApp())
      .post("/passkey/authenticate/verify")
      .send({ response: { id: 5 } });
    expect(res.status).toBe(400);
  });

  it("401s on an unknown credential", async () => {
    const res = await request(makeApp())
      .post("/passkey/authenticate/verify")
      .send({ response: { id: "missing", response: { clientDataJSON: b64url("{}") } } });
    expect(res.status).toBe(401);
  });

  it("authenticates a known passkey successfully", async () => {
    const userId = "user-9";
    dbState.users.push({ id: userId, username: "alice", email: null });
    dbState.passkeys.push({
      id: "cred-1",
      userId,
      publicKey: b64url("pk"),
      counter: 0,
      transports: ["internal"],
    });
    const challenge = "auth-1";
    dbState.challenges.push({
      id: "c1",
      challenge,
      kind: "authenticate",
      expiresAt: new Date(Date.now() + 60_000),
    });
    verifyAuthenticationResponse.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });
    const clientDataJSON = b64url(JSON.stringify({ challenge }));
    const res = await request(makeApp())
      .post("/passkey/authenticate/verify")
      .send({
        response: { id: "cred-1", response: { clientDataJSON } },
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe("session-jwt");
  });
});

describe("POST /passkey/refresh", () => {
  it("401s with no auth header", async () => {
    const res = await request(makeApp()).post("/passkey/refresh");
    expect(res.status).toBe(401);
  });

  it("401s when the JWT is invalid", async () => {
    verifySessionJwt.mockReturnValueOnce(null);
    const res = await request(makeApp())
      .post("/passkey/refresh")
      .set("Authorization", "Bearer bad");
    expect(res.status).toBe(401);
  });

  it("401s when the token row is gone", async () => {
    verifySessionJwt.mockReturnValueOnce({ userId: "u1", jti: "j1" });
    // dbState.tokens stays empty -> delete().returning() resolves []
    const res = await request(makeApp())
      .post("/passkey/refresh")
      .set("Authorization", "Bearer any");
    expect(res.status).toBe(401);
  });

  it("issues a new token on success", async () => {
    verifySessionJwt.mockReturnValueOnce({ userId: "u1", jti: "j1" });
    dbState.tokens.push({ id: "j1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });
    dbState.users.push({ id: "u1", username: "alice", email: null });
    const res = await request(makeApp())
      .post("/passkey/refresh")
      .set("Authorization", "Bearer any");
    expect(res.status).toBe(200);
    expect(res.body.token).toBe("session-jwt");
  });
});

describe("GET /passkey/count", () => {
  it("401s without auth header", async () => {
    const res = await request(makeApp()).get("/passkey/count");
    expect(res.status).toBe(401);
  });

  it("401s when JWT verification fails", async () => {
    verifySessionJwt.mockReturnValueOnce(null);
    const res = await request(makeApp())
      .get("/passkey/count")
      .set("Authorization", "Bearer bad");
    expect(res.status).toBe(401);
  });

  it("returns the count of passkeys for the authenticated user", async () => {
    verifySessionJwt.mockReturnValueOnce({ userId: "u1", jti: "j1" });
    dbState.tokens.push({ id: "j1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });
    dbState.passkeys.push({ id: "k1", userId: "u1" }, { id: "k2", userId: "u1" });
    const res = await request(makeApp())
      .get("/passkey/count")
      .set("Authorization", "Bearer ok");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
});

describe("POST /passkey/logout", () => {
  it("400s without auth header", async () => {
    const res = await request(makeApp()).post("/passkey/logout");
    expect(res.status).toBe(400);
  });

  it("returns success and reports already-logged-out when JWT is unverifiable", async () => {
    verifySessionJwt.mockReturnValueOnce(null);
    const res = await request(makeApp())
      .post("/passkey/logout")
      .set("Authorization", "Bearer bad");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Already logged out");
  });

  it("revokes the session token when found", async () => {
    verifySessionJwt.mockReturnValueOnce({ userId: "u1", jti: "j1" });
    dbState.tokens.push({ id: "j1", userId: "u1", expiresAt: new Date(Date.now() + 60_000) });
    const res = await request(makeApp())
      .post("/passkey/logout")
      .set("Authorization", "Bearer ok");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
    expect(dbState.tokens).toHaveLength(0);
  });
});
