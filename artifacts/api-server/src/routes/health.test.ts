import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import healthRouter from "./health";

describe("GET /healthz", () => {
  const app = express();
  app.use(healthRouter);

  it("returns the schema-validated health payload", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
