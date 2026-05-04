import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@workspace/scripts-data", () => ({
  getAvailableScripts: vi.fn(),
  getScriptById: vi.fn(),
}));

import express from "express";
import request from "supertest";
import scriptsRouter from "./scripts";
import * as scriptsData from "@workspace/scripts-data";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(scriptsRouter);
  return app;
}

describe("/scripts routes", () => {
  beforeEach(() => {
    vi.mocked(scriptsData.getAvailableScripts).mockReset();
    vi.mocked(scriptsData.getScriptById).mockReset();
  });

  it("GET /scripts returns the script catalog", async () => {
    const meta = [
      {
        id: "foo",
        title: "Foo",
        description: "d",
        language: "en",
      },
    ];
    vi.mocked(scriptsData.getAvailableScripts).mockReturnValue(meta);

    const res = await request(makeApp()).get("/scripts");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ scripts: meta });
  });

  it("GET /scripts/:id returns the meta and content", async () => {
    vi.mocked(scriptsData.getScriptById).mockReturnValue({
      meta: { id: "foo", title: "Foo", description: "d", language: "en" },
      content: { lines: [{ speaker: "A", line: "hi" }] },
    });

    const res = await request(makeApp()).get("/scripts/foo");
    expect(res.status).toBe(200);
    expect(res.body.meta.id).toBe("foo");
    expect(res.body.content.lines).toHaveLength(1);
  });

  it("GET /scripts/:id 404s on unknown id", async () => {
    vi.mocked(scriptsData.getScriptById).mockReturnValue(null);
    const res = await request(makeApp()).get("/scripts/missing");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Script not found");
  });
});
