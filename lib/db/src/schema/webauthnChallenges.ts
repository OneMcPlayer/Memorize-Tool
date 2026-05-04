import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const webauthnChallengesTable = pgTable("webauthn_challenges", {
  id: text("id").primaryKey(),
  challenge: text("challenge").notNull(),
  kind: text("kind").notNull(),
  username: text("username"),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type WebauthnChallenge = typeof webauthnChallengesTable.$inferSelect;
export type InsertWebauthnChallenge = typeof webauthnChallengesTable.$inferInsert;
