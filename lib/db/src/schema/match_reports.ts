import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { fixturesTable } from "./fixtures";

export const matchReportsTable = pgTable("match_reports", {
  id: serial("id").primaryKey(),
  fixtureId: integer("fixture_id").notNull().unique().references(() => fixturesTable.id, { onDelete: "cascade" }),
  overview: text("overview"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matchReportPhotosTable = pgTable("match_report_photos", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => matchReportsTable.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MatchReport = typeof matchReportsTable.$inferSelect;
export type MatchReportPhoto = typeof matchReportPhotosTable.$inferSelect;
