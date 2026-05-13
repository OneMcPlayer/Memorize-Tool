import crypto from "node:crypto";
import {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { z } from "zod/v4";
import {
  appendDiagnosticLog,
  appendSessionlessDiagnosticLog,
  createDiagnosticSession,
  type DiagnosticLogEntry,
  getDiagnosticSession,
} from "../lib/diagnosticSessions";
import { requireAccessToken } from "../middleware/requireAccessToken";

const router: IRouter = Router();
const TRUE_ENV_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_ENV_VALUES = new Set(["0", "false", "no", "off"]);

function readBooleanEnv(name: string): boolean | null {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value || value === "auto") return null;
  if (TRUE_ENV_VALUES.has(value)) return true;
  if (FALSE_ENV_VALUES.has(value)) return false;
  return null;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function areDiagnosticRoutesEnabled(): boolean {
  const configured = readBooleanEnv("ENABLE_DIAG_ROUTES");
  if (configured !== null) return configured;
  return !isProduction();
}

function shouldRequireDiagnosticAuth(): boolean {
  const configured = readBooleanEnv("DIAG_REQUIRE_AUTH");
  if (configured !== null) return configured;
  return isProduction();
}

function shouldRequireDiagnosticAdmin(): boolean {
  const configured = readBooleanEnv("DIAG_REQUIRE_ADMIN");
  if (configured !== null) return configured;
  return isProduction();
}

function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function isAdminReadRequest(req: Request): boolean {
  return (
    req.method === "GET" &&
    /^\/diag\/sessions\/[^/]+\/logs$/.test(req.path)
  );
}

function isBootFallbackRequest(req: Request): boolean {
  return (
    (req.method === "GET" && req.path === "/diag/web-health") ||
    (req.method === "POST" && req.path === "/diag/boot-failure")
  );
}

function requireDiagnosticAdminToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.DIAG_ADMIN_TOKEN;
  if (!expected) {
    res.status(403).json({ error: "diag_admin_token_not_configured" });
    return;
  }

  const provided = req.get("x-diag-admin-token");
  if (
    !provided ||
    !constantTimeEqual(Buffer.from(provided), Buffer.from(expected))
  ) {
    res.status(401).json({ error: "invalid_diag_admin_token" });
    return;
  }

  next();
}

router.use((req, res, next): void => {
  if (!areDiagnosticRoutesEnabled()) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  // The static HTML boot fallback runs before the React app and before any
  // access token flow. Keep this minimal probe/report path public so failed
  // boots can recover and leave useful diagnostics, while richer logs stay
  // behind the normal access/admin gates below.
  if (isBootFallbackRequest(req)) {
    next();
    return;
  }

  if (isAdminReadRequest(req) && shouldRequireDiagnosticAdmin()) {
    requireDiagnosticAdminToken(req, res, next);
    return;
  }

  if (shouldRequireDiagnosticAuth()) {
    requireAccessToken(req, res, next);
    return;
  }

  next();
});

const bootFailureSchema = z.object({
  reason: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
  url: z.string().max(500).optional(),
  timestamp: z.number().optional(),
});

const sourceSchema = z.string().trim().min(1).max(120).optional();
const logLevelSchema = z.enum(["debug", "info", "warn", "error"]).optional();

const sessionSchema = z.object({
  browser: z.unknown().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  mode: z.string().trim().min(1).max(120).optional(),
  route: z.string().trim().min(1).max(300).optional(),
  source: sourceSchema,
});

const clientLogEntrySchema = z.object({
  details: z.unknown().optional(),
  event: z.string().trim().min(1).max(300),
  level: logLevelSchema,
  timestamp: z.string().trim().min(1).max(80).optional(),
});

const clientLogsSchema = z.object({
  entries: z.array(clientLogEntrySchema).max(50),
  source: sourceSchema,
});

const diagnosticPayloadSchema = z.object({
  breadcrumbs: z.array(z.unknown()).max(120).optional(),
  browser: z.unknown().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  error: z.unknown().optional(),
  event: z.string().trim().max(300).optional(),
  extras: z.record(z.string(), z.unknown()).optional(),
  severity: z.enum(["debug", "info", "warning", "warn", "error"]).optional(),
  timestamp: z.string().trim().max(80).optional(),
  type: z.string().trim().min(1).max(300).optional(),
  version: z.string().trim().max(80).optional(),
});

function normalizeDiagnosticLevel(
  severity?: "debug" | "info" | "warning" | "warn" | "error",
): DiagnosticLogEntry["level"] {
  if (severity === "warning") return "warn";
  return severity;
}

router.post("/diag/boot-failure", (req, res): void => {
  const parsed = bootFailureSchema.safeParse(req.body ?? {});
  const payload = parsed.success ? parsed.data : {};
  appendSessionlessDiagnosticLog({
    event: "boot-failure",
    kind: "diagnostic",
    level: "warn",
    payload,
    source: "boot-fallback",
  });
  req.log.warn(
    { event: "boot-failure", ...payload, ip: req.ip },
    "Client reported boot fallback timeout",
  );
  res.json({ received: true });
});

router.post("/diag/sessions", (req, res): void => {
  const parsed = sessionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid diagnostic session payload" });
    return;
  }
  const session = createDiagnosticSession(parsed.data);
  res.status(201).json({
    createdAt: session.createdAt,
    logCount: session.logs.length,
    sessionId: session.id,
  });
});

router.post("/diag/client-logs", (req, res): void => {
  const parsed = clientLogsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid client log payload" });
    return;
  }
  for (const entry of parsed.data.entries) {
    appendSessionlessDiagnosticLog({
      details: entry.details,
      event: entry.event,
      kind: "client-log",
      level: entry.level,
      source: parsed.data.source,
      timestamp: entry.timestamp,
    });
  }
  res.json({ accepted: parsed.data.entries.length });
});

router.get("/diag/sessions/:sessionId/logs", (req, res): void => {
  const session = getDiagnosticSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Diagnostic session not found" });
    return;
  }
  const after = Number(req.query.after);
  const logs = Number.isFinite(after)
    ? session.logs.filter((entry) => entry.seq > after)
    : session.logs;
  res.json({
    createdAt: session.createdAt,
    logs,
    metadata: session.metadata,
    sessionId: session.id,
    updatedAt: session.updatedAt,
  });
});

router.post("/diag/sessions/:sessionId/client-logs", (req, res): void => {
  const session = getDiagnosticSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Diagnostic session not found" });
    return;
  }
  const parsed = clientLogsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid client log payload" });
    return;
  }
  let accepted = 0;
  for (const entry of parsed.data.entries) {
    const saved = appendDiagnosticLog(session.id, {
      details: entry.details,
      event: entry.event,
      kind: "client-log",
      level: entry.level,
      source: parsed.data.source,
      timestamp: entry.timestamp,
    });
    if (saved) accepted += 1;
  }
  res.json({ accepted, sessionId: session.id });
});

router.post("/diag/diagnostics", (req, res): void => {
  const parsed = diagnosticPayloadSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid diagnostic payload" });
    return;
  }
  appendSessionlessDiagnosticLog({
    event: parsed.data.type ?? parsed.data.event ?? "client-diagnostic",
    kind: "diagnostic",
    level: normalizeDiagnosticLevel(parsed.data.severity),
    payload: parsed.data,
    source: "memorize-tool",
    timestamp: parsed.data.timestamp,
  });
  res.json({ accepted: true });
});

router.post("/diag/sessions/:sessionId/diagnostics", (req, res): void => {
  const session = getDiagnosticSession(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "Diagnostic session not found" });
    return;
  }
  const parsed = diagnosticPayloadSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid diagnostic payload" });
    return;
  }
  appendDiagnosticLog(session.id, {
    event: parsed.data.type ?? parsed.data.event ?? "client-diagnostic",
    kind: "diagnostic",
    level: normalizeDiagnosticLevel(parsed.data.severity),
    payload: parsed.data,
    source: "memorize-tool",
    timestamp: parsed.data.timestamp,
  });
  res.json({ accepted: true, sessionId: session.id });
});

router.get("/diag/web-health", async (req, res): Promise<void> => {
  const target = process.env.WEB_HEALTH_URL ?? "http://localhost:80/";
  res.setHeader("Cache-Control", "no-store");
  try {
    const r = await fetch(target, {
      method: "GET",
      signal: AbortSignal.timeout(3_000),
      redirect: "manual",
    });
    const healthy = r.status > 0 && r.status < 500;
    res.json({ healthy, status: r.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    req.log.debug({ err }, "web-health probe failed");
    res.json({ healthy: false, error: message });
  }
});

export default router;
