import { describe, it, expect, beforeEach, vi } from "vitest";

const dbState: { instructions: string | null; updatedAt: Date | null } = {
  instructions: null,
  updatedAt: null,
};

vi.mock("@workspace/db", () => {
  const select = vi.fn(() => ({
    from: () => ({
      where: async () =>
        dbState.instructions === null && dbState.updatedAt === null
          ? []
          : [{ instructions: dbState.instructions, updatedAt: dbState.updatedAt }],
    }),
  }));
  const insert = vi.fn(() => ({
    values: (v: { studioInstructions: string | null }) => ({
      onConflictDoUpdate: async (cfg: { set: { studioInstructions: string | null } }) => {
        dbState.instructions = cfg.set.studioInstructions;
        dbState.updatedAt = new Date();
        void v;
      },
    }),
  }));
  return {
    db: { select, insert },
    userSettingsTable: {
      userId: "user_id",
      studioInstructions: "studio_instructions",
      updatedAt: "updated_at",
    },
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
import studioRouter from "./studio";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(studioRouter);
  return app;
}

describe("/user/studio-instructions routes", () => {
  beforeEach(() => {
    dbState.instructions = null;
    dbState.updatedAt = null;
  });

  it("GET returns an empty deprecated payload when there is no row", async () => {
    const res = await request(makeApp()).get("/user/studio-instructions");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      instructions: "",
      updatedAt: null,
      maxLength: 2000,
      deprecated: true,
    });
  });

  it("GET returns the stored instructions when present", async () => {
    dbState.instructions = "say it softly";
    dbState.updatedAt = new Date("2025-01-01T00:00:00Z");
    const res = await request(makeApp()).get("/user/studio-instructions");
    expect(res.body.instructions).toBe("say it softly");
    expect(res.body.updatedAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("PUT trims and stores instructions", async () => {
    const res = await request(makeApp())
      .put("/user/studio-instructions")
      .send({ instructions: "  speak slowly  " });
    expect(res.status).toBe(200);
    expect(res.body.instructions).toBe("speak slowly");
    expect(dbState.instructions).toBe("speak slowly");
  });

  it("PUT clears the value to null when given an empty string", async () => {
    dbState.instructions = "previous";
    const res = await request(makeApp())
      .put("/user/studio-instructions")
      .send({ instructions: "   " });
    expect(res.status).toBe(200);
    expect(res.body.instructions).toBe("");
    expect(dbState.instructions).toBeNull();
  });

  it("PUT 400s on invalid body", async () => {
    const res = await request(makeApp())
      .put("/user/studio-instructions")
      .send({ instructions: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid request body/);
  });

  it("PUT 400s when instructions exceed the max length", async () => {
    const res = await request(makeApp())
      .put("/user/studio-instructions")
      .send({ instructions: "x".repeat(2001) });
    expect(res.status).toBe(400);
  });
});
