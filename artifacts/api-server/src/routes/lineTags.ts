import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, userSettingsTable } from "@workspace/db";
import { requireAuth } from "../middleware/requireAuth";

const router: IRouter = Router();

// Length limit applies to the full marked-up line string the user authors,
// e.g. "Hello [angry] world, [whisper] goodbye". Sized to comfortably hold a
// long cue line plus several inline directives.
export const LINE_TAG_MAX_LENGTH = 2000;
export const SCRIPT_KEY_MAX_LENGTH = 200;
export const MAX_LINES_PER_SCRIPT = 5000;

// Storage format version for per-script line-tag entries.
//   v1 (legacy, no marker): each value is a "tag prefix" prepended to the
//       original cue line at playback time.
//   v2: each value is the full marked-up line authored by the user, with
//       bracketed tags placed anywhere inside it.
// We tag rows with `v` on write so the client never has to guess which
// format a stored entry uses.
const CURRENT_LINE_TAGS_VERSION = 2 as const;
type StoredLines = Record<string, string>;
type StoredEntry = StoredLines | { v: number; lines: StoredLines };

function isVersionedEntry(
  value: StoredEntry,
): value is { v: number; lines: StoredLines } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "v" in value &&
    "lines" in value &&
    typeof (value as { v: unknown }).v === "number"
  );
}

function readEntry(value: StoredEntry | undefined): {
  lines: StoredLines;
  version: number;
} {
  if (!value) return { lines: {}, version: CURRENT_LINE_TAGS_VERSION };
  if (isVersionedEntry(value)) {
    return { lines: value.lines ?? {}, version: value.v };
  }
  // Legacy bare map — stored before the inline-tags upgrade.
  return { lines: value, version: 1 };
}

const scriptKeySchema = z
  .string()
  .min(1, "scriptKey is required")
  .max(SCRIPT_KEY_MAX_LENGTH, `scriptKey must be at most ${SCRIPT_KEY_MAX_LENGTH} characters`);

const tagsMapSchema = z
  .record(
    z.string().regex(/^\d+$/, "Line index must be a non-negative integer"),
    z.string().max(LINE_TAG_MAX_LENGTH, `Tag must be at most ${LINE_TAG_MAX_LENGTH} characters`),
  )
  .refine((m) => Object.keys(m).length <= MAX_LINES_PER_SCRIPT, {
    message: `Too many lines (max ${MAX_LINES_PER_SCRIPT})`,
  });

const putBodySchema = z.object({
  scriptKey: scriptKeySchema,
  tags: tagsMapSchema,
});

router.get("/user/line-tags", requireAuth, async (req, res): Promise<void> => {
  const user = req.authUser!;
  const scriptKey = typeof req.query.scriptKey === "string" ? req.query.scriptKey : "";
  const parsed = scriptKeySchema.safeParse(scriptKey);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid scriptKey", issues: parsed.error.issues });
    return;
  }
  const [row] = await db
    .select({ lineTags: userSettingsTable.lineTags })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, user.id));
  const all = (row?.lineTags ?? {}) as Record<string, StoredEntry>;
  const { lines, version } = readEntry(all[parsed.data]);
  res.json({
    scriptKey: parsed.data,
    tags: lines,
    maxLength: LINE_TAG_MAX_LENGTH,
    version,
  });
});

router.put("/user/line-tags", requireAuth, async (req, res): Promise<void> => {
  const user = req.authUser!;
  const parsed = putBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  const { scriptKey, tags } = parsed.data;

  // Drop empty / whitespace-only entries so the JSON stays compact and reads
  // cleanly. An empty tag map for a script removes the script entry entirely.
  const cleanedEntries: [string, string][] = [];
  for (const [idx, raw] of Object.entries(tags)) {
    const v = raw.trim();
    if (v.length > 0) cleanedEntries.push([idx, v]);
  }
  const cleaned: Record<string, string> = Object.fromEntries(cleanedEntries);

  const [existing] = await db
    .select({ lineTags: userSettingsTable.lineTags })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, user.id));
  const all = {
    ...((existing?.lineTags ?? {}) as Record<string, StoredEntry>),
  };
  if (Object.keys(cleaned).length === 0) {
    delete all[scriptKey];
  } else {
    // Always write in the new versioned shape so subsequent reads return
    // the values verbatim and never trigger the v1→v2 migration.
    all[scriptKey] = { v: CURRENT_LINE_TAGS_VERSION, lines: cleaned };
  }
  const next = Object.keys(all).length === 0 ? null : all;

  await db
    .insert(userSettingsTable)
    .values({ userId: user.id, lineTags: next })
    .onConflictDoUpdate({
      target: userSettingsTable.userId,
      set: { lineTags: next },
    });
  req.log.info(
    { userId: user.id, scriptKey, taggedLines: Object.keys(cleaned).length },
    "Line tags updated",
  );
  res.json({
    scriptKey,
    tags: cleaned,
    maxLength: LINE_TAG_MAX_LENGTH,
    version: CURRENT_LINE_TAGS_VERSION,
  });
});

export default router;
