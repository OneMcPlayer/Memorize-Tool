import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import accessRouter from "./access";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(accessRouter);
  return app;
}

describe("/access/verify", () => {
  it("returns 401 when no access token is provided", async () => {
    const res = await request(makeApp()).get("/access/verify");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_access_token");
  });

  it("returns 401 when the access token is wrong", async () => {
    const res = await request(makeApp())
      .get("/access/verify")
      .set("x-access-token", "wrong-token");
    expect(res.status).toBe(401);
  });

  it("returns { ok: true } when the access token matches", async () => {
    const res = await request(makeApp())
      .get("/access/verify")
      .set("x-access-token", process.env.MAIN_ACCESS_TOKEN!);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
