import { withAccessTokenHeader } from "../lib/accessToken";
import { apiPath } from "../lib/apiPath";
import { getScopedStorageItem } from "../lib/scopedLocalStorage";

const BASE = apiPath("/user/line-tags");

function authHeaders(): Record<string, string> {
  const authToken = getScopedStorageItem("authToken");
  return withAccessTokenHeader(
    authToken ? { Authorization: `Bearer ${authToken}` } : {},
  );
}

export type LineTagsMap = Record<string, string>;

/**
 * Resolve the marked-up version of a cue line for playback / display.
 *
 * In the new data model the persisted entry IS the full marked-up line
 * (e.g. "Hello [angry] world"). This helper just returns it verbatim, or
 * the original line when no entry is saved. Legacy "prefix-only" entries
 * are upgraded once at the load boundary by `migrateLegacyLineTags`, not
 * on every read, so authored content always round-trips unchanged.
 */
export function resolveMarkedUpLine(
  saved: string | undefined | null,
  originalLine: string,
): string {
  const trimmed = (saved ?? "").trim();
  return trimmed.length > 0 ? trimmed : originalLine;
}

export function prepareLineForTts(line: string): string {
  let result = line;
  let previous: string;
  do {
    previous = result;
    result = result.replace(/\([^()]*\)/g, " ");
  } while (result !== previous);

  return result
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

export interface CueLineForMigration {
  originalIndex: number;
  line: string;
}

/**
 * One-shot upgrade of legacy v1 "prefix tag" entries to the new v2
 * "full marked-up line" format. Caller MUST only invoke this when the
 * server reports `version === 1` for the script — otherwise we'd risk
 * misinterpreting a valid v2 entry whose markup happens to displace the
 * original line text.
 *
 * For every saved entry, the result is `<prefix> <originalLine>`.
 * Entries whose line index no longer maps to a cue line are dropped,
 * since we have no original text to splice in.
 */
export function migrateLegacyLineTags(
  saved: LineTagsMap,
  cueLines: CueLineForMigration[],
): LineTagsMap {
  const byIndex = new Map<string, string>();
  for (const c of cueLines) byIndex.set(String(c.originalIndex), c.line);
  const next: LineTagsMap = {};
  for (const [key, raw] of Object.entries(saved)) {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) continue;
    const original = byIndex.get(key);
    if (original === undefined) continue;
    next[key] = `${trimmed} ${original}`;
  }
  return next;
}

export interface LineTagsPayload {
  scriptKey: string;
  tags: LineTagsMap;
  maxLength: number;
  /**
   * Storage format version for the entries in `tags`:
   *   1 — legacy "prefix tag" entries; client must migrate before use.
   *   2 — full marked-up lines authored by the user; use verbatim.
   * Older servers may omit this field; treat missing as v1 to be safe.
   */
  version?: number;
}

export function hashScriptText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return `t${(h >>> 0).toString(36)}_${text.length}`;
}

export function buildScriptKey(scriptId: string | undefined, scriptText: string): string {
  return scriptId && scriptId.trim()
    ? `id:${scriptId.trim()}`
    : `hash:${hashScriptText(scriptText)}`;
}

export async function fetchLineTags(scriptKey: string): Promise<LineTagsPayload> {
  const url = `${BASE}?scriptKey=${encodeURIComponent(scriptKey)}`;
  const res = await fetch(url, { method: "GET", headers: authHeaders() });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = (await res.json()) as { error?: string };
      msg = data.error ?? msg;
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as LineTagsPayload;
}

export async function saveLineTags(
  scriptKey: string,
  tags: LineTagsMap,
): Promise<LineTagsPayload> {
  const res = await fetch(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ scriptKey, tags }),
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = (await res.json()) as { error?: string };
      msg = data.error ?? msg;
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as LineTagsPayload;
}
