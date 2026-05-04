import { describe, it, expect, beforeEach, vi } from "vitest";

const revokeSessionByAuthHeader = vi.fn();

vi.mock("./passkey", () => ({
  default: { use: () => {} },
  revokeSessionByAuthHeader: (...args: unknown[]) => revokeSessionByAuthHeader(...args),
}));

vi.mock("../middleware/requireAuth", () => ({
  requireAuth: (
    req: { authUser: { id: string; username: string; email: string | null } },
    _res: unknown,
    next: () => void,
  ) => {
    req.authUser = { id: "user-123", username: "alice", email: null };
    next();
  },
}));

import express from "express";
import request from "supertest";
import userRouter from "./user";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(userRouter);
  return app;
}

describe("/user routes", () => {
  beforeEach(() => {
    revokeSessionByAuthHeader.mockReset();
  });

  it("GET /user/me returns the authenticated user payload", async () => {
    const res = await request(makeApp())
      .get("/user/me")
      .set("Authorization", "Bearer whatever");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "user-123",
      username: "alice",
      displayName: "alice",
      email: null,
      groups: [],
      isAuthenticated: true,
    });
  });

  it("POST /user/logout returns success when revoke succeeds", async () => {
    revokeSessionByAuthHeader.mockResolvedValueOnce({ ok: true, alreadyLoggedOut: false });
    const res = await request(makeApp())
      .post("/user/logout")
      .set("Authorization", "Bearer abc");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "Logged out successfully" });
  });

  it("POST /user/logout reports already-logged-out idempotently", async () => {
    revokeSessionByAuthHeader.mockResolvedValueOnce({ ok: true, alreadyLoggedOut: true });
    const res = await request(makeApp())
      .post("/user/logout")
      .set("Authorization", "Bearer abc");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Already logged out");
  });

  it("POST /user/logout surfaces 400 when the auth header is missing", async () => {
    revokeSessionByAuthHeader.mockResolvedValueOnce({
      ok: false,
      alreadyLoggedOut: false,
      status: 400,
      error: "Missing or invalid authorization header",
    });
    const res = await request(makeApp()).post("/user/logout");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing or invalid authorization header/);
  });
});
