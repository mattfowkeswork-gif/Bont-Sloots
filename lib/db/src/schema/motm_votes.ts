import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";
import { fixturesTable } from "./fixtures";

export const motmVotesTable = pgTable("motm_votes", {
  id: serial("id").primaryKey(),
  fixtureId: integer("fixture_id").notNull().references(() => fixturesTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMotmVoteSchema = createInsertSchema(motmVotesTable).omit({ id: true, createdAt: true });
export type InsertMotmVote = z.infer<typeof insertMotmVoteSchema>;
export type MotmVote = typeof motmVotesTable.$inferSelect;
