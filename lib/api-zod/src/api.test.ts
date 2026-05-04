import { describe, it, expect } from "vitest";
import {
  HealthCheckResponse,
  GetUserMeResponse,
  GetScriptResponse,
  ListScriptsResponse,
  TtsSpeechBody,
  AudioTranscriptionsResponse,
  PasskeyRegisterOptionsBody,
  PasskeyRegisterVerifyResponse,
  PasskeyAuthenticateVerifyResponse,
} from "./generated/api";

describe("api-zod schemas", () => {
  describe("HealthCheckResponse", () => {
    it("round-trips a valid payload", () => {
      const value = { status: "ok" };
      expect(HealthCheckResponse.parse(value)).toEqual(value);
    });
    it("rejects missing status", () => {
      expect(() => HealthCheckResponse.parse({})).toThrow();
    });
  });

  describe("ListScriptsResponse", () => {
    it("accepts a script catalog", () => {
      const v = {
        scripts: [
          { id: "a", title: "A", description: "d", language: "it" },
          {
            id: "b",
            title: "B",
            author: "x",
            description: "d",
            language: "en",
          },
        ],
      };
      expect(ListScriptsResponse.parse(v)).toEqual(v);
    });
    it("rejects missing language", () => {
      expect(() =>
        ListScriptsResponse.parse({
          scripts: [{ id: "a", title: "A", description: "d" }],
        }),
      ).toThrow();
    });
  });

  describe("GetScriptResponse", () => {
    it("accepts a parsed script", () => {
      const v = {
        meta: { id: "x", title: "X", description: "d", language: "it" },
        content: { lines: [{ speaker: "S", line: "L" }] },
      };
      expect(GetScriptResponse.parse(v)).toEqual(v);
    });
    it("rejects malformed lines", () => {
      expect(() =>
        GetScriptResponse.parse({
          meta: { id: "x", title: "X", description: "d", language: "it" },
          content: { lines: [{ speaker: "S" }] },
        }),
      ).toThrow();
    });
  });

  describe("TtsSpeechBody", () => {
    it("accepts minimal body and a full body", () => {
      expect(TtsSpeechBody.parse({ text: "hi" })).toEqual({ text: "hi" });
      expect(
        TtsSpeechBody.parse({
          text: "hi",
          voice: "alloy",
          speed: 1.5,
          model: "tts-1",
        }),
      ).toMatchObject({ text: "hi", voice: "alloy", speed: 1.5 });
    });
    it("rejects empty text", () => {
      expect(() => TtsSpeechBody.parse({ text: "" })).toThrow();
    });
    it("rejects out-of-range speed", () => {
      expect(() => TtsSpeechBody.parse({ text: "hi", speed: 10 })).toThrow();
      expect(() => TtsSpeechBody.parse({ text: "hi", speed: 0.1 })).toThrow();
    });
    it("rejects unknown model", () => {
      expect(() =>
        TtsSpeechBody.parse({ text: "hi", model: "gpt-1000" }),
      ).toThrow();
    });
  });

  describe("AudioTranscriptionsResponse", () => {
    it("requires text", () => {
      expect(AudioTranscriptionsResponse.parse({ text: "hi" })).toEqual({
        text: "hi",
      });
      expect(() => AudioTranscriptionsResponse.parse({})).toThrow();
    });
  });

  describe("Auth schemas", () => {
    it("PasskeyRegisterOptionsBody rejects empty username", () => {
      expect(() => PasskeyRegisterOptionsBody.parse({ username: "" })).toThrow();
      expect(PasskeyRegisterOptionsBody.parse({ username: "alice" })).toEqual({
        username: "alice",
      });
    });
    it("PasskeyRegisterVerifyResponse round-trips a verified payload", () => {
      const v = {
        success: true,
        userId: "u1",
        user: { id: "u1", username: "alice", email: null },
        token: "jwt",
        expiresAt: 123,
      };
      expect(PasskeyRegisterVerifyResponse.parse(v)).toEqual(v);
    });
    it("PasskeyAuthenticateVerifyResponse rejects missing token", () => {
      expect(() =>
        PasskeyAuthenticateVerifyResponse.parse({
          success: true,
          user: { id: "1", username: "a" },
          expiresAt: 1,
        }),
      ).toThrow();
    });
    it("GetUserMeResponse accepts a minimal payload", () => {
      expect(
        GetUserMeResponse.parse({
          username: "a",
          displayName: "A",
          isAuthenticated: true,
        }),
      ).toMatchObject({ username: "a", isAuthenticated: true });
    });
  });
});
