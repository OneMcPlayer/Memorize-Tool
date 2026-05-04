import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userSettingsTable = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  openaiApiKey: text("openai_api_key"),
  // Deprecated: previously powered the removed Studio Mode UI. Kept on the
  // schema to avoid a destructive migration. Only the deprecated
  // `/api/user/studio-instructions` GET/PUT compatibility surface still
  // reads/writes this column; no new code path should use it.
  studioInstructions: text("studio_instructions"),
  // Per-script line-tag storage. Each script entry is either:
  //   - legacy v1: a bare `Record<lineIndex, prefixString>`, or
  //   - v2: `{ v: 2, lines: Record<lineIndex, fullMarkedUpLine> }`.
  // The line-tags route normalizes both shapes on read and always writes v2.
  lineTags: jsonb("line_tags").$type<
    Record<
      string,
      Record<string, string> | { v: number; lines: Record<string, string> }
    >
  >(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
export type InsertUserSettings = typeof userSettingsTable.$inferInsert;
