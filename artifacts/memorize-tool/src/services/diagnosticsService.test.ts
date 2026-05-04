import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDiagnosticReport,
  captureDiagnostic,
  recordDiagnosticBreadcrumb,
  redactDiagnosticText,
  resetDiagnosticsForTests,
  sanitizeDiagnosticValue,
  startDiagnosticSession,
} from "./diagnosticsService";

describe("diagnosticsService", () => {
  beforeEach(() => {
    resetDiagnosticsForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ accepted: 1 }),
        ok: true,
        status: 200,
      })),
    );
  });

  it("redacts API keys and bearer tokens from free-form text", () => {
    expect(
      redactDiagnosticText("key sk-abc123 Authorization: Bearer token123"),
    ).toContain("sk-[redacted]");
    expect(redactDiagnosticText("Authorization: Bearer token123")).toContain(
      "Bearer [redacted]",
    );
  });

  it("sanitizes sensitive object fields", () => {
    const sanitized = sanitizeDiagnosticValue({
      apiKey: "sk-real",
      nested: {
        transcript: "full spoken text",
        ok: "safe",
      },
    }) as Record<string, unknown>;

    expect(sanitized.apiKey).toBe("[redacted]");
    expect((sanitized.nested as Record<string, unknown>).transcript).toBe(
      "[redacted]",
    );
    expect((sanitized.nested as Record<string, unknown>).ok).toBe("safe");
  });

  it("starts a backend diagnostic session and uploads session breadcrumbs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ sessionId: "session-1" }),
        ok: true,
        status: 201,
      })
      .mockResolvedValue({
        json: async () => ({ accepted: 1 }),
        ok: true,
        status: 200,
      });
    vi.stubGlobal("fetch", fetchMock);

    const sessionId = await startDiagnosticSession({
      context: { scriptKey: "id:test" },
      mode: "live-memorization",
    });

    expect(sessionId).toBe("session-1");
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes("/api/diag/sessions"),
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes("/client-logs"),
      ),
    ).toBe(true);
  });

  it("captures diagnostics without throwing when upload fails", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    expect(() =>
      captureDiagnostic({
        error: new Error("failed with sk-secret"),
        extras: { lineText: "hidden" },
        type: "stt-error",
      }),
    ).not.toThrow();
  });

  it("builds a redacted local debug report fallback", () => {
    recordDiagnosticBreadcrumb("stt-result", {
      transcript: "private spoken words",
      transcriptLength: 20,
    });

    const report = buildDiagnosticReport();
    expect(report).toContain("stt-result");
    expect(report).toContain("[redacted]");
    expect(report).not.toContain("private spoken words");
  });
});
