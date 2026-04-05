import { pgTable, text, serial, timestamp, boolean, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { seasonsTable } from "./seasons";

export const fixturesTable = pgTable("fixtures", {
  id: serial("id").primaryKey(),
  opponent: text("opponent").notNull(),
  matchDate: date("match_date").notNull(),
  kickoffTime: text("kickoff_time"),
  kickoffTbc: boolean("kickoff_tbc").notNull().default(false),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  played: boolean("played").notNull().default(false),
  isHome: boolean("is_home").notNull().default(true),
  venue: text("venue"),
  notes: text("notes"),
  seasonId: integer("season_id").references(() => seasonsTable.id, { onDelete: "set null" }),
  votingClosesAt: timestamp("voting_closes_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFixtureSchema = createInsertSchema(fixturesTable).omit({ id: true, createdAt: true });
export type InsertFixture = z.infer<typeof insertFixtureSchema>;
export type Fixture = typeof fixturesTable.$inferSelect;
