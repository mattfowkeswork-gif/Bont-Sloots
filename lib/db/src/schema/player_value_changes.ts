import { pgTable, serial, integer, timestamp, jsonb, unique, boolean } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { fixturesTable } from "./fixtures";

export const playerValueChangesTable = pgTable("player_value_changes", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  fixtureId: integer("fixture_id").notNull().references(() => fixturesTable.id, { onDelete: "cascade" }),
  totalChange: integer("total_change").notNull().default(0),
  breakdown: jsonb("breakdown").$type<{ label: string; amount: number }[]>().notNull().default([]),
  isKing: boolean("is_king").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.playerId, t.fixtureId)]);

export type PlayerValueChange = typeof playerValueChangesTable.$inferSelect;
