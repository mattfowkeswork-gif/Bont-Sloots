import { pgTable, serial, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";
import { fixturesTable } from "./fixtures";

export const statsTable = pgTable("stats", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  fixtureId: integer("fixture_id").notNull().references(() => fixturesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'goal' | 'assist'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStatSchema = createInsertSchema(statsTable).omit({ id: true, createdAt: true });
export type InsertStat = z.infer<typeof insertStatSchema>;
export type Stat = typeof statsTable.$inferSelect;
