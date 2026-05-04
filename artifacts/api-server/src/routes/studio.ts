import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, userSettingsTable } from "@workspace/db";
import { requireAuth } from "../middleware/requireAuth";

// NOTE: The Studio Mode UI has been removed in favor of per-line cue tags.
// These endpoints remain as deprecated read/write surfaces backed by the
// still-present `user_settings.studio_instructions` column so older clients
// don't 404. New code must not call them.

const router: IRouter = Router();

export const STUDIO_INSTRUCTIONS_MAX_LENGTH = 2000;

const putBodySchema = z.object({
  instructions: z
    .string()
    .max(STUDIO_INSTRUCTIONS_MAX_LENGTH, `Instructions must be at most ${STUDIO_INSTRUCTIONS_MAX_LENGTH} characters`),
});

router.get("/user/studio-instructions", requireAuth, async (req, res): Promise<void> => {
  const user = req.authUser!;
  const [row] = await db
    .select({ instructions: userSettingsTable.studioInstructions, updatedAt: userSettingsTable.updatedAt })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, user.id));
  res.json({
    instructions: row?.instructions ?? "",
    updatedAt: row?.updatedAt ?? null,
    maxLength: STUDIO_INSTRUCTIONS_MAX_LENGTH,
    deprecated: true,
  });
});

router.put("/user/studio-instructions", requireAuth, async (req, res): Promise<void> => {
  const user = req.authUser!;
  const parsed = putBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }
  const trimmed = parsed.data.instructions.trim();
  // Preserve the original semantics: an empty string clears the value back
  // to NULL rather than persisting "".
  const stored: string | null = trimmed.length > 0 ? trimmed : null;
  await db
    .insert(userSettingsTable)
    .values({ userId: user.id, studioInstructions: stored })
    .onConflictDoUpdate({
      target: userSettingsTable.userId,
      set: { studioInstructions: stored },
    });
  res.json({
    instructions: stored ?? "",
    maxLength: STUDIO_INSTRUCTIONS_MAX_LENGTH,
    deprecated: true,
  });
});

export default router;
