import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import diagRouter from "./diag";
import { resetDiagnosticSessionsForTests } from "../lib/diagnosticSessions";

const ORIGINAL_ENV = { ...process.env };

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (
      req as unknown as {
        log: {
          info: () => void;
          warn: () => void;
          error: () => void;
          debug: () => void;
        };
      }
    ).log = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
    next();
  });
  app.use(diagRouter);
  return app;
}

describe("/diag routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetDiagnosticSessionsForTests();
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
    process.env.NODE_ENV = "test";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("404s diagnostic routes by default in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENABLE_DIAG_ROUTES;

    const res = await request(makeApp())
      .post("/diag/sessions")
      .send({ source: "test" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("requires the normal access token for production diagnostic writes", async () => {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_DIAG_ROUTES = "true";
    process.env.MAIN_ACCESS_TOKEN = "diag-access";

    const blocked = await request(makeApp())
      .post("/diag/sessions")
      .send({ source: "test" });

    expect(blocked.status).toBe(401);
    expect(blocked.body).toEqual({ error: "invalid_access_token" });

    const accepted = await request(makeApp())
      .post("/diag/sessions")
      .set("x-access-token", "diag-access")
      .send({ source: "test" });

    expect(accepted.status).toBe(201);
    expect(accepted.body.sessionId).toEqual(expect.any(String));
  });

  it("allows boot fallback probes without an access token when diagnostics are enabled", async () => {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_DIAG_ROUTES = "true";
    process.env.DIAG_REQUIRE_AUTH = "true";
    process.env.DIAG_REQUIRE_ADMIN = "true";
    process.env.MAIN_ACCESS_TOKEN = "diag-access";
    process.env.DIAG_ADMIN_TOKEN = "diag-admin";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 200 }),
    );

    const health = await request(makeApp()).get("/diag/web-health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ healthy: true, status: 200 });

    const bootFailure = await request(makeApp())
      .post("/diag/boot-failure")
      .send({ reason: "timeout", url: "https://x.example/dev/" });
    expect(bootFailure.status).toBe(200);
    expect(bootFailure.body).toEqual({ received: true });

    const richWrite = await request(makeApp())
      .post("/diag/sessions")
      .send({ source: "test" });
    expect(richWrite.status).toBe(401);
    expect(richWrite.body).toEqual({ error: "invalid_access_token" });
  });

  it("requires the diagnostics admin token for production log reads", async () => {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_DIAG_ROUTES = "true";
    process.env.MAIN_ACCESS_TOKEN = "diag-access";
    process.env.DIAG_ADMIN_TOKEN = "diag-admin";

    const app = makeApp();
    const created = await request(app)
      .post("/diag/sessions")
      .set("x-access-token", "diag-access")
      .send({ source: "test" });
    const sessionId = created.body.sessionId as string;

    const blocked = await request(app)
      .get(`/diag/sessions/${sessionId}/logs`)
      .set("x-access-token", "diag-access");

    expect(blocked.status).toBe(401);
    expect(blocked.body).toEqual({ error: "invalid_diag_admin_token" });

    const accepted = await request(app)
      .get(`/diag/sessions/${sessionId}/logs`)
      .set("x-diag-admin-token", "diag-admin");

    expect(accepted.status).toBe(200);
    expect(accepted.body.sessionId).toBe(sessionId);
  });

  it("POST /diag/boot-failure accepts a valid payload", async () => {
    const res = await request(makeApp())
      .post("/diag/boot-failure")
      .send({ reason: "timeout", url: "https://x.example", timestamp: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it("POST /diag/boot-failure tolerates invalid payloads (still 200)", async () => {
    const res = await request(makeApp())
      .post("/diag/boot-failure")
      .send({ reason: 123 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it("GET /diag/web-health reports healthy on a 2xx upstream", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 200 }),
    );
    const res = await request(makeApp()).get("/diag/web-health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ healthy: true, status: 200 });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("GET /diag/web-health reports unhealthy on 5xx upstream", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 503 }),
    );
    const res = await request(makeApp()).get("/diag/web-health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ healthy: false, status: 503 });
  });

  it("GET /diag/web-health reports unhealthy when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
    const res = await request(makeApp()).get("/diag/web-health");
    expect(res.status).toBe(200);
    expect(res.body.healthy).toBe(false);
    expect(res.body.error).toBe("boom");
  });

  it("creates a diagnostic session and stores client logs", async () => {
    const app = makeApp();
    const created = await request(app)
      .post("/diag/sessions")
      .send({
        mode: "live-memorization",
        route: "InteractiveMemorizationView",
        source: "test",
      });

    expect(created.status).toBe(201);
    expect(created.body.sessionId).toEqual(expect.any(String));

    const sessionId = created.body.sessionId as string;
    const posted = await request(app)
      .post(`/diag/sessions/${sessionId}/client-logs`)
      .send({
        entries: [
          {
            details: { cursor: 2, transcript: "this must not be stored" },
            event: "recording-stopped",
            level: "info",
            timestamp: "2026-05-03T16:00:00.000Z",
          },
        ],
        source: "client",
      });

    expect(posted.status).toBe(200);
    expect(posted.body).toEqual({ accepted: 1, sessionId });

    const logs = await request(app).get(`/diag/sessions/${sessionId}/logs`);
    expect(logs.status).toBe(200);
    expect(logs.body.logs).toHaveLength(2);
    expect(logs.body.logs[1]).toMatchObject({
      event: "recording-stopped",
      kind: "client-log",
      level: "info",
      seq: 2,
    });
    expect(logs.body.logs[1].details.transcript).toBe("[redacted]");
  });

  it("filters session logs after a sequence number", async () => {
    const app = makeApp();
    const created = await request(app)
      .post("/diag/sessions")
      .send({ source: "test" });
    const sessionId = created.body.sessionId as string;

    await request(app)
      .post(`/diag/sessions/${sessionId}/client-logs`)
      .send({
        entries: [
          { event: "first", timestamp: "2026-05-03T16:00:00.000Z" },
          { event: "second", timestamp: "2026-05-03T16:00:01.000Z" },
        ],
      });

    const logs = await request(app).get(
      `/diag/sessions/${sessionId}/logs?after=2`,
    );
    expect(logs.status).toBe(200);
    expect(
      logs.body.logs.map((entry: { event: string }) => entry.event),
    ).toEqual(["second"]);
  });

  it("stores diagnostic payloads with sensitive fields redacted", async () => {
    const app = makeApp();
    const created = await request(app)
      .post("/diag/sessions")
      .send({ source: "test" });
    const sessionId = created.body.sessionId as string;

    const diagnostic = await request(app)
      .post(`/diag/sessions/${sessionId}/diagnostics`)
      .send({
        error: {
          message: "failed with sk-secret123",
          stack: "Authorization: Bearer abc",
        },
        extras: { apiKey: "sk-real", lineText: "full script line" },
        severity: "error",
        timestamp: "2026-05-03T16:00:00.000Z",
        type: "stt-error",
      });

    expect(diagnostic.status).toBe(200);

    const logs = await request(app).get(`/diag/sessions/${sessionId}/logs`);
    const payload = logs.body.logs[1].payload;
    expect(payload.error.message).toContain("sk-[redacted]");
    expect(payload.error.stack).toContain("Bearer [redacted]");
    expect(payload.extras.apiKey).toBe("[redacted]");
    expect(payload.extras.lineText).toBe("[redacted]");
  });

  it("404s session-scoped writes for unknown diagnostic sessions", async () => {
    const res = await request(makeApp())
      .post("/diag/sessions/missing/client-logs")
      .send({ entries: [{ event: "x" }] });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Diagnostic session not found");
  });
});
