import { describe, it, expect, beforeEach, vi } from "vitest";

const dbState: { lineTags: Record<string, unknown> | null } = { lineTags: null };

const insertCalls: unknown[] = [];

vi.mock("@workspace/db", () => {
  const select = vi.fn(() => ({
    from: () => ({
      where: async () => (dbState.lineTags === null ? [] : [{ lineTags: dbState.lineTags }]),
    }),
  }));
  const insert = vi.fn(() => ({
    values: (v: unknown) => ({
      onConflictDoUpdate: async (cfg: unknown) => {
        insertCalls.push({ values: v, cfg });
        const set = (cfg as { set: { lineTags: Record<string, unknown> | null } }).set;
        dbState.lineTags = set.lineTags;
      },
    }),
  }));
  return {
    db: { select, insert },
    userSettingsTable: { userId: "user_id", lineTags: "line_tags" },
  };
});

vi.mock("../middleware/requireAuth", () => ({
  requireAuth: (
    req: { authUser: { id: string } },
    _res: unknown,
    next: () => void,
  ) => {
    req.authUser = { id: "user-123" };
    next();
  },
}));

import express from "express";
import request from "supertest";
import lineTagsRouter from "./lineTags";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { log: { info: () => void } }).log = { info: () => {} };
    next();
  });
  app.use(lineTagsRouter);
  return app;
}

describe("/user/line-tags routes", () => {
  beforeEach(() => {
    dbState.lineTags = null;
    insertCalls.length = 0;
  });

  it("GET returns an empty v2 payload when the user has no settings row", async () => {
    const res = await request(makeApp()).get(
      "/user/line-tags?scriptKey=id:foo",
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      scriptKey: "id:foo",
      tags: {},
      maxLength: 2000,
      version: 2,
    });
  });

  it("GET reports v1 when the row contains a legacy bare map", async () => {
    dbState.lineTags = {
      "id:foo": { "0": "[angry]", "2": "[soft]" },
    };
    const res = await request(makeApp()).get(
      "/user/line-tags?scriptKey=id:foo",
    );
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(1);
    expect(res.body.tags).toEqual({ "0": "[angry]", "2": "[soft]" });
  });

  it("GET unwraps versioned v2 entries", async () => {
    dbState.lineTags = {
      "id:foo": { v: 2, lines: { "0": "Hello [angry] world" } },
    };
    const res = await request(makeApp()).get(
      "/user/line-tags?scriptKey=id:foo",
    );
    expect(res.body).toMatchObject({
      version: 2,
      tags: { "0": "Hello [angry] world" },
    });
  });

  it("GET 400s on missing scriptKey", async () => {
    const res = await request(makeApp()).get("/user/line-tags");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid scriptKey/);
  });

  it("PUT writes a v2 entry and trims empty values", async () => {
    const res = await request(makeApp())
      .put("/user/line-tags")
      .send({
        scriptKey: "id:foo",
        tags: { "0": "  [angry] hi  ", "1": "   " },
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      scriptKey: "id:foo",
      tags: { "0": "[angry] hi" },
      maxLength: 2000,
      version: 2,
    });
    expect(dbState.lineTags).toEqual({
      "id:foo": { v: 2, lines: { "0": "[angry] hi" } },
    });
  });

  it("PUT with an empty tags map removes the script entry and stores null when nothing remains", async () => {
    dbState.lineTags = { "id:foo": { v: 2, lines: { "0": "x" } } };
    const res = await request(makeApp())
      .put("/user/line-tags")
      .send({ scriptKey: "id:foo", tags: {} });
    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual({});
    expect(dbState.lineTags).toBeNull();
  });

  it("PUT 400s on invalid body", async () => {
    const res = await request(makeApp())
      .put("/user/line-tags")
      .send({ scriptKey: "", tags: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid request body/);
  });

  it("PUT 400s when a tag exceeds the max length", async () => {
    const tooLong = "x".repeat(2001);
    const res = await request(makeApp())
      .put("/user/line-tags")
      .send({ scriptKey: "id:foo", tags: { "0": tooLong } });
    expect(res.status).toBe(400);
  });
});
