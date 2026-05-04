export type DiagnosticLevel = "debug" | "info" | "warn" | "error";

export interface DiagnosticBreadcrumb {
  details?: unknown;
  event: string;
  level?: DiagnosticLevel;
  timestamp: string;
}

export interface DiagnosticSessionOptions {
  browser?: unknown;
  context?: Record<string, unknown>;
  mode: string;
  route?: string;
  source?: string;
}

const MAX_BREADCRUMBS = 120;
const MAX_UPLOAD_BATCH = 50;
const MAX_TEXT_LENGTH = 1200;
const SENSITIVE_KEY_RE =
  /(api.?key|authorization|cookie|token|secret|password|audio|blob|transcript|spoken|expected|scripttext|linetext|fullscript|recording)/i;

let activeSessionId: string | null = null;
let pendingSessionClearId: string | null = null;
let uploadInFlight = false;
let initialized = false;
const breadcrumbs: DiagnosticBreadcrumb[] = [];
const pendingUploads: DiagnosticBreadcrumb[] = [];

const apiPath = (path: string): string => {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
  return `${base}/api${path}`;
};

export function redactDiagnosticText(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-[redacted]")
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^|\s,"'}]+/gi, "$1[redacted]")
    .replace(/("authorization"\s*:\s*")([^"]+)(")/gi, "$1[redacted]$3")
    .replace(
      /("(?:apiKey|openaiApiKey|token|secret|password)"\s*:\s*")([^"]+)(")/gi,
      "$1[redacted]$3",
    )
    .slice(0, MAX_TEXT_LENGTH);
}

export function sanitizeDiagnosticValue(
  value: unknown,
  key = "",
  depth = 0,
): unknown {
  if (SENSITIVE_KEY_RE.test(key)) return "[redacted]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactDiagnosticText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) {
    return {
      message: redactDiagnosticText(value.message),
      name: value.name,
      stack: value.stack ? redactDiagnosticText(value.stack) : undefined,
    };
  }
  if (depth >= 5) return "[truncated]";
  if (Array.isArray(value)) {
    return value
      .slice(0, 100)
      .map((item) => sanitizeDiagnosticValue(item, key, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 80)
        .map(([entryKey, entryValue]) => [
          entryKey,
          sanitizeDiagnosticValue(entryValue, entryKey, depth + 1),
        ]),
    );
  }
  return redactDiagnosticText(String(value));
}

function browserSnapshot(): Record<string, unknown> | null {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return null;
  return {
    language: navigator.language || null,
    online: navigator.onLine,
    platform: navigator.platform || null,
    secureContext: window.isSecureContext,
    serviceWorkerController:
      "serviceWorker" in navigator
        ? Boolean(navigator.serviceWorker.controller)
        : null,
    url: window.location.href,
    userAgent: navigator.userAgent,
    visibility: document.visibilityState,
  };
}

function normalizeBreadcrumb(
  entry: DiagnosticBreadcrumb,
): DiagnosticBreadcrumb {
  return {
    details: sanitizeDiagnosticValue(entry.details, "details"),
    event: redactDiagnosticText(entry.event).slice(0, 300),
    level: entry.level,
    timestamp: entry.timestamp,
  };
}

export function getActiveDiagnosticSessionId(): string | null {
  return activeSessionId;
}

export function recordDiagnosticBreadcrumb(
  event: string,
  details?: unknown,
  level: DiagnosticLevel = "info",
): void {
  const entry = normalizeBreadcrumb({
    details,
    event,
    level,
    timestamp: new Date().toISOString(),
  });
  breadcrumbs.push(entry);
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.splice(0, breadcrumbs.length - MAX_BREADCRUMBS);
  }
  pendingUploads.push(entry);
  void flushDiagnosticLogs();
}

export async function startDiagnosticSession(
  options: DiagnosticSessionOptions,
): Promise<string | null> {
  const payload = sanitizeDiagnosticValue({
    ...options,
    browser: options.browser ?? browserSnapshot(),
    source: options.source ?? "memorize-tool",
  });

  try {
    const res = await fetch(apiPath("/diag/sessions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok)
      throw new Error(`Diagnostic session failed with status ${res.status}`);
    const data = (await res.json()) as { sessionId?: string };
    activeSessionId =
      typeof data.sessionId === "string" ? data.sessionId : null;
    pendingSessionClearId = null;
    recordDiagnosticBreadcrumb("diagnostic-session-started", {
      sessionId: activeSessionId,
    });
    await flushDiagnosticLogs();
    return activeSessionId;
  } catch (error) {
    activeSessionId = null;
    // Keep local breadcrumbs even if the backend is not reachable.
    breadcrumbs.push(
      normalizeBreadcrumb({
        details: error,
        event: "diagnostic-session-start-failed",
        level: "warn",
        timestamp: new Date().toISOString(),
      }),
    );
    return null;
  }
}

export function endDiagnosticSession(reason = "ended"): void {
  const sessionId = activeSessionId;
  if (sessionId) pendingSessionClearId = sessionId;
  recordDiagnosticBreadcrumb("diagnostic-session-ended", { reason }, "info");
  void flushDiagnosticLogs();
}

export async function flushDiagnosticLogs(): Promise<void> {
  if (uploadInFlight) return;
  if (pendingUploads.length === 0) {
    if (pendingSessionClearId && activeSessionId === pendingSessionClearId) {
      activeSessionId = null;
      pendingSessionClearId = null;
    }
    return;
  }
  uploadInFlight = true;
  try {
    while (pendingUploads.length > 0) {
      const batch = pendingUploads.splice(0, MAX_UPLOAD_BATCH);
      const url = activeSessionId
        ? apiPath(
            `/diag/sessions/${encodeURIComponent(activeSessionId)}/client-logs`,
          )
        : apiPath("/diag/client-logs");

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: batch, source: "memorize-tool" }),
        });
        if (!res.ok)
          throw new Error(
            `Diagnostic log upload failed with status ${res.status}`,
          );
      } catch {
        pendingUploads.unshift(...batch);
        if (pendingUploads.length > MAX_BREADCRUMBS) {
          pendingUploads.splice(0, pendingUploads.length - MAX_BREADCRUMBS);
        }
        break;
      }
    }
  } finally {
    uploadInFlight = false;
    if (pendingSessionClearId && activeSessionId === pendingSessionClearId) {
      activeSessionId = null;
      pendingSessionClearId = null;
    }
  }
}

export function captureDiagnostic(options: {
  error?: unknown;
  extras?: Record<string, unknown>;
  severity?: DiagnosticLevel | "warning";
  type: string;
}): void {
  const payload = sanitizeDiagnosticValue({
    breadcrumbs: breadcrumbs.slice(-80),
    browser: browserSnapshot(),
    error: options.error,
    extras: options.extras,
    severity: options.severity ?? "error",
    timestamp: new Date().toISOString(),
    type: options.type,
    version: import.meta.env.VITE_APP_VERSION ?? "dev",
  });
  const url = activeSessionId
    ? apiPath(
        `/diag/sessions/${encodeURIComponent(activeSessionId)}/diagnostics`,
      )
    : apiPath("/diag/diagnostics");
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Diagnostics should never affect rehearsal flow.
  });
}

export function initializeDiagnostics(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("error", (event) => {
    captureDiagnostic({
      error: event.error ?? event.message,
      extras: {
        columnNumber: event.colno,
        filename: event.filename,
        lineNumber: event.lineno,
      },
      type: "window-error",
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    captureDiagnostic({
      error: event.reason,
      type: "unhandled-rejection",
    });
  });
}

export function buildDiagnosticReport(): string {
  return JSON.stringify(
    sanitizeDiagnosticValue({
      activeSessionId,
      breadcrumbs: breadcrumbs.slice(-MAX_BREADCRUMBS),
      browser: browserSnapshot(),
      createdAt: new Date().toISOString(),
      pendingUploadCount: pendingUploads.length,
    }),
    null,
    2,
  );
}

export function resetDiagnosticsForTests(): void {
  activeSessionId = null;
  pendingSessionClearId = null;
  uploadInFlight = false;
  initialized = false;
  breadcrumbs.splice(0, breadcrumbs.length);
  pendingUploads.splice(0, pendingUploads.length);
}
