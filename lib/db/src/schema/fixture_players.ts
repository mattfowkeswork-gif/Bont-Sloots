import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";
import { fixturesTable } from "./fixtures";

export const fixturePlayersTable = pgTable("fixture_players", {
  id: serial("id").primaryKey(),
  fixtureId: integer("fixture_id").notNull().references(() => fixturesTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  present: boolean("present").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFixturePlayerSchema = createInsertSchema(fixturePlayersTable).omit({ id: true, createdAt: true });
export type InsertFixturePlayer = z.infer<typeof insertFixturePlayerSchema>;
export type FixturePlayer = typeof fixturePlayersTable.$inferSelect;
