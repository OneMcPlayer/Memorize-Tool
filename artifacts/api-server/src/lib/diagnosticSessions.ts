import crypto from "node:crypto";
import path from "node:path";
import { mkdir, appendFile } from "node:fs/promises";

const MAX_TEXT_LENGTH = 1200;
const MAX_OBJECT_DEPTH = 5;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_KEYS = 80;
const MAX_SESSIONS = 100;
const MAX_LOGS_PER_SESSION = 600;

const SENSITIVE_KEY_RE =
  /(api.?key|authorization|cookie|token|secret|password|audio|blob|transcript|spoken|expected|scripttext|linetext|fullscript|recording)/i;

export interface DiagnosticLogEntry {
  details?: unknown;
  event: string;
  kind: "client-log" | "diagnostic" | "session";
  level?: "debug" | "info" | "warn" | "error";
  payload?: unknown;
  seq: number;
  source?: string;
  timestamp: string;
}

export interface DiagnosticSession {
  createdAt: string;
  id: string;
  logs: DiagnosticLogEntry[];
  metadata: Record<string, unknown>;
  nextSeq: number;
  updatedAt: string;
}

const sessions = new Map<string, DiagnosticSession>();

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
  if (SENSITIVE_KEY_RE.test(key)) {
    return "[redacted]";
  }

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
  if (depth >= MAX_OBJECT_DEPTH) return "[truncated]";
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeDiagnosticValue(item, key, depth + 1));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      MAX_OBJECT_KEYS,
    );
    return Object.fromEntries(
      entries.map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeDiagnosticValue(entryValue, entryKey, depth + 1),
      ]),
    );
  }

  return String(value);
}

function resolveDefaultLogPath(): string {
  const cwd = process.cwd();
  const isApiServerCwd =
    path.basename(cwd) === "api-server" &&
    path.basename(path.dirname(cwd)) === "artifacts";
  const artifactDir = isApiServerCwd
    ? cwd
    : path.join(cwd, "artifacts", "api-server");
  return path.join(artifactDir, "output", "diag-session-logs.jsonl");
}

function getLogPath(): string {
  return process.env["DIAG_LOG_PATH"] ?? resolveDefaultLogPath();
}

async function persistDiagnosticRecord(
  record: Record<string, unknown>,
): Promise<void> {
  if (process.env["DIAG_LOG_DISABLED"] === "true") return;
  if (process.env.NODE_ENV === "test" && !process.env["DIAG_LOG_PATH"]) return;

  const logPath = getLogPath();
  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(record)}\n`, "utf8");
}

function persistBestEffort(record: Record<string, unknown>): void {
  void persistDiagnosticRecord(record).catch(() => {
    // Diagnostics must never break rehearsal or API requests.
  });
}

function pruneSessions(): void {
  if (sessions.size <= MAX_SESSIONS) return;
  const ordered = [...sessions.values()].sort((a, b) =>
    a.updatedAt.localeCompare(b.updatedAt),
  );
  for (const session of ordered.slice(0, sessions.size - MAX_SESSIONS)) {
    sessions.delete(session.id);
  }
}

export function createDiagnosticSession(
  metadata: Record<string, unknown> = {},
): DiagnosticSession {
  const now = new Date().toISOString();
  const session: DiagnosticSession = {
    createdAt: now,
    id: crypto.randomUUID(),
    logs: [],
    metadata: sanitizeDiagnosticValue(metadata) as Record<string, unknown>,
    nextSeq: 1,
    updatedAt: now,
  };
  sessions.set(session.id, session);
  pruneSessions();
  appendDiagnosticLog(session.id, {
    event: "session-created",
    kind: "session",
    payload: session.metadata,
    source:
      typeof metadata["source"] === "string" ? metadata["source"] : undefined,
  });
  return session;
}

export function getDiagnosticSession(
  sessionId: string,
): DiagnosticSession | null {
  return sessions.get(sessionId) ?? null;
}

export function appendDiagnosticLog(
  sessionId: string,
  input: {
    details?: unknown;
    event: string;
    kind: DiagnosticLogEntry["kind"];
    level?: DiagnosticLogEntry["level"];
    payload?: unknown;
    source?: string;
    timestamp?: string;
  },
): DiagnosticLogEntry | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const now = new Date().toISOString();
  const entry: DiagnosticLogEntry = {
    details: sanitizeDiagnosticValue(input.details, "details"),
    event: redactDiagnosticText(input.event).slice(0, 300),
    kind: input.kind,
    level: input.level,
    payload: sanitizeDiagnosticValue(input.payload),
    seq: session.nextSeq,
    source: input.source
      ? redactDiagnosticText(input.source).slice(0, 120)
      : undefined,
    timestamp: input.timestamp
      ? redactDiagnosticText(input.timestamp).slice(0, 80)
      : now,
  };
  session.nextSeq += 1;
  session.updatedAt = now;
  session.logs = [...session.logs, entry].slice(-MAX_LOGS_PER_SESSION);

  persistBestEffort({
    createdAt: session.createdAt,
    entry,
    mode: session.metadata["mode"] ?? "diagnostic-session",
    sessionId,
    updatedAt: session.updatedAt,
  });

  return entry;
}

export function appendSessionlessDiagnosticLog(input: {
  details?: unknown;
  event: string;
  kind: DiagnosticLogEntry["kind"];
  level?: DiagnosticLogEntry["level"];
  payload?: unknown;
  source?: string;
  timestamp?: string;
}): DiagnosticLogEntry {
  const entry: DiagnosticLogEntry = {
    details: sanitizeDiagnosticValue(input.details, "details"),
    event: redactDiagnosticText(input.event).slice(0, 300),
    kind: input.kind,
    level: input.level,
    payload: sanitizeDiagnosticValue(input.payload),
    seq: 0,
    source: input.source
      ? redactDiagnosticText(input.source).slice(0, 120)
      : undefined,
    timestamp: input.timestamp
      ? redactDiagnosticText(input.timestamp).slice(0, 80)
      : new Date().toISOString(),
  };
  persistBestEffort({
    entry,
    mode: "sessionless-diagnostic",
    sessionId: null,
  });
  return entry;
}

export function resetDiagnosticSessionsForTests(): void {
  sessions.clear();
}
