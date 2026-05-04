import { describe, it, expect } from "vitest";
import {
  convertJsonScriptToText,
  getAvailableScripts,
  getScriptById,
  getScriptContent,
  scriptCatalog,
  type JsonScript,
} from "./index";

describe("scripts-data", () => {
  it("getAvailableScripts returns the full catalog", () => {
    expect(getAvailableScripts()).toBe(scriptCatalog);
    expect(scriptCatalog.length).toBeGreaterThan(0);
    for (const meta of scriptCatalog) {
      expect(meta.id).toMatch(/^[a-z0-9-]+$/);
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.language).toBeTruthy();
    }
  });

  it("getScriptById returns null for an unknown id", () => {
    expect(getScriptById("does-not-exist")).toBeNull();
  });

  it("getScriptById returns meta + content with lines for known ids", () => {
    const result = getScriptById("a-porte-chiuse");
    expect(result).not.toBeNull();
    expect(result!.meta.id).toBe("a-porte-chiuse");
    expect(Array.isArray(result!.content.lines)).toBe(true);
    expect(result!.content.lines.length).toBeGreaterThan(0);
    const first = result!.content.lines[0];
    expect(typeof first.speaker).toBe("string");
    expect(typeof first.line).toBe("string");
  });

  it("getScriptContent returns empty string for unknown ids", () => {
    expect(getScriptContent("nope")).toBe("");
  });

  it("convertJsonScriptToText joins speaker and line with newlines", () => {
    const script: JsonScript = {
      lines: [
        { speaker: "ALICE", line: "Ciao" },
        { speaker: "BOB", line: "Salve" },
      ],
    };
    expect(convertJsonScriptToText(script)).toBe("ALICE: Ciao\nBOB: Salve");
  });

  it("convertJsonScriptToText handles malformed input safely", () => {
    expect(convertJsonScriptToText({ lines: [] })).toBe("");
    expect(convertJsonScriptToText(undefined as unknown as JsonScript)).toBe("");
    expect(
      convertJsonScriptToText({ lines: undefined as unknown as JsonScript["lines"] }),
    ).toBe("");
  });

  it("every catalog entry resolves to real content", () => {
    for (const meta of scriptCatalog) {
      const r = getScriptById(meta.id);
      expect(r, `script ${meta.id} should resolve`).not.toBeNull();
      expect(r!.content.lines.length).toBeGreaterThan(0);
    }
  });
});
