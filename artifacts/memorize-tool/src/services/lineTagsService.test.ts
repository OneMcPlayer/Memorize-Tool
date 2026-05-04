import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildScriptKey,
  fetchLineTags,
  hashScriptText,
  migrateLegacyLineTags,
  resolveMarkedUpLine,
  saveLineTags,
} from "./lineTagsService";

describe("lineTagsService — pure helpers", () => {
  it("resolveMarkedUpLine prefers the saved entry when non-empty", () => {
    expect(resolveMarkedUpLine("Hello [angry] world", "Hello world")).toBe(
      "Hello [angry] world",
    );
  });
  it("resolveMarkedUpLine falls back to the original line on empty input", () => {
    expect(resolveMarkedUpLine("", "Hello")).toBe("Hello");
    expect(resolveMarkedUpLine(null, "Hello")).toBe("Hello");
    expect(resolveMarkedUpLine("   ", "Hello")).toBe("Hello");
  });

  it("hashScriptText is deterministic and length-aware", () => {
    expect(hashScriptText("abc")).toBe(hashScriptText("abc"));
    expect(hashScriptText("abc")).not.toBe(hashScriptText("abd"));
    expect(hashScriptText("abc")).toMatch(/^t[a-z0-9]+_3$/);
  });

  it("buildScriptKey prefers id when present, falls back to hash", () => {
    expect(buildScriptKey("my-id", "ignored")).toBe("id:my-id");
    expect(buildScriptKey(undefined, "abc")).toBe(
      `hash:${hashScriptText("abc")}`,
    );
    expect(buildScriptKey("   ", "abc")).toBe(`hash:${hashScriptText("abc")}`);
  });

  it("migrateLegacyLineTags upgrades v1 prefix entries", () => {
    const cueLines = [
      { originalIndex: 0, line: "Hello world" },
      { originalIndex: 2, line: "Goodbye" },
    ];
    const migrated = migrateLegacyLineTags(
      { "0": "[angry]", "2": "[whisper]", "9": "stale" },
      cueLines,
    );
    expect(migrated).toEqual({
      "0": "[angry] Hello world",
      "2": "[whisper] Goodbye",
    });
  });

  it("migrateLegacyLineTags drops empty prefixes", () => {
    expect(
      migrateLegacyLineTags(
        { "0": "  ", "1": "[ok]" },
        [
          { originalIndex: 0, line: "a" },
          { originalIndex: 1, line: "b" },
        ],
      ),
    ).toEqual({ "1": "[ok] b" });
  });
});

describe("lineTagsService — fetch wrappers", () => {
  beforeEach(() => {
    localStorage.setItem("authToken", "tok-123");
  });

  function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
    const fn = vi.fn(async () => response as Response);
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("fetchLineTags returns parsed payload on 200", async () => {
    const payload = {
      scriptKey: "id:foo",
      tags: { "0": "[ok]" },
      maxLength: 2000,
      version: 2,
    };
    const fn = mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => payload,
    });
    const result = await fetchLineTags("id:foo");
    expect(result).toEqual(payload);
    const [url, init] = fn.mock.calls[0]!;
    expect(url).toContain("scriptKey=id%3Afoo");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer tok-123",
    });
  });

  it("fetchLineTags throws with status on HTTP error", async () => {
    mockFetchOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "nope" }),
    });
    await expect(fetchLineTags("id:foo")).rejects.toMatchObject({
      message: "nope",
      status: 401,
    });
  });

  it("fetchLineTags surfaces network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom");
      }),
    );
    await expect(fetchLineTags("id:foo")).rejects.toThrow("boom");
  });

  it("saveLineTags PUTs the payload as JSON", async () => {
    const payload = {
      scriptKey: "id:foo",
      tags: { "0": "x" },
      maxLength: 2000,
      version: 2,
    };
    const fn = mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => payload,
    });
    const result = await saveLineTags("id:foo", { "0": "x" });
    expect(result).toEqual(payload);
    const init = fn.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify({ scriptKey: "id:foo", tags: { "0": "x" } }));
  });

  it("saveLineTags throws on HTTP error using statusText fallback", async () => {
    mockFetchOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      json: async () => {
        throw new Error("not json");
      },
    });
    await expect(saveLineTags("id:foo", {})).rejects.toMatchObject({
      message: "Server Error",
      status: 500,
    });
  });
});
