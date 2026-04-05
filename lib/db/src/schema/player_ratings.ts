import { pgTable, serial, integer, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { fixturesTable } from "./fixtures";

export const playerRatingsTable = pgTable("player_ratings", {
  id: serial("id").primaryKey(),
  fixtureId: integer("fixture_id").notNull().references(() => fixturesTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  rating: numeric("rating", { precision: 3, scale: 1 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.fixtureId, t.playerId)]);

export type PlayerRating = typeof playerRatingsTable.$inferSelect;
