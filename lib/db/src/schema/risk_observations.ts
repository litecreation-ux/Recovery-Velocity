import { doublePrecision, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const riskObservationsTable = pgTable("risk_observations", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code").notNull(),
  indicatorCode: text("indicator_code").notNull(),
  indicatorName: text("indicator_name").notNull(),
  value: doublePrecision("value"),
  observationDate: text("observation_date"),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRiskObservationSchema = createInsertSchema(riskObservationsTable).omit({
  id: true,
  retrievedAt: true,
});
export type RiskObservation = typeof riskObservationsTable.$inferSelect;
export type InsertRiskObservation = z.infer<typeof insertRiskObservationSchema>;