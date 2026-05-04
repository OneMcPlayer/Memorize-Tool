import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { signSessionJwt, verifySessionJwt } from "./sessionJwt";

describe("sessionJwt", () => {
  it("signs and verifies a round-trip token", () => {
    const { token, expiresAt } = signSessionJwt({ userId: "u1", jti: "j1" });
    expect(typeof token).toBe("string");
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect(verifySessionJwt(token)).toEqual({ userId: "u1", jti: "j1" });
  });

  it("returns null when the token is tampered", () => {
    const { token } = signSessionJwt({ userId: "u1", jti: "j1" });
    const parts = token.split(".");
    parts[2] = parts[2].split("").reverse().join("");
    expect(verifySessionJwt(parts.join("."))).toBeNull();
  });

  it("returns null on garbage input", () => {
    expect(verifySessionJwt("not-a-token")).toBeNull();
    expect(verifySessionJwt("")).toBeNull();
  });

  it("returns null when the token is expired", () => {
    const realNow = Date.now;
    try {
      // Sign a token that is already past expiry by faking time during verify.
      const { token } = signSessionJwt({ userId: "u1", jti: "j1" });
      vi.spyOn(Date, "now").mockImplementation(
        () => realNow() + 25 * 60 * 60 * 1000,
      );
      expect(verifySessionJwt(token)).toBeNull();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("returns null when the token is signed with a different secret", () => {
    const stranger = jwt.sign({ userId: "u1" }, "wrong-secret", {
      algorithm: "HS256",
      jwtid: "j1",
      expiresIn: 3600,
    });
    expect(verifySessionJwt(stranger)).toBeNull();
  });

  it("throws if SESSION_SECRET is missing", () => {
    const prev = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    try {
      expect(() => signSessionJwt({ userId: "u", jti: "j" })).toThrow(
        /SESSION_SECRET/,
      );
    } finally {
      process.env.SESSION_SECRET = prev;
    }
  });
});
