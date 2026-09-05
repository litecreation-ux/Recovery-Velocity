import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const historicalHazardEventsTable = pgTable("historical_hazard_events", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code").notNull(),
  eventName: text("event_name").notNull(),
  eventYear: text("event_year").notNull(),
  hazardType: text("hazard_type").notNull(),
  severity: text("severity"),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHistoricalHazardEventSchema = createInsertSchema(historicalHazardEventsTable).omit({
  id: true,
  observedAt: true,
});
export type HistoricalHazardEvent = typeof historicalHazardEventsTable.$inferSelect;
export type InsertHistoricalHazardEvent = z.infer<typeof insertHistoricalHazardEventSchema>;