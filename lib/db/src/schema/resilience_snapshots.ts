import { doublePrecision, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resilienceSnapshotsTable = pgTable("resilience_snapshots", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code").notNull(),
  modelVersion: text("model_version").notNull(),
  score: doublePrecision("score"),
  factorsJson: text("factors_json").notNull(),
  limitations: text("limitations").notNull(),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResilienceSnapshotSchema = createInsertSchema(resilienceSnapshotsTable).omit({
  id: true,
  calculatedAt: true,
});
export type ResilienceSnapshot = typeof resilienceSnapshotsTable.$inferSelect;
export type InsertResilienceSnapshot = z.infer<typeof insertResilienceSnapshotSchema>;