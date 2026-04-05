import { pgTable, serial, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";
import { fixturesTable } from "./fixtures";

export const awardsTable = pgTable("awards", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  fixtureId: integer("fixture_id").notNull().references(() => fixturesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'mom' | 'motm'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAwardSchema = createInsertSchema(awardsTable).omit({ id: true, createdAt: true });
export type InsertAward = z.infer<typeof insertAwardSchema>;
export type Award = typeof awardsTable.$inferSelect;
