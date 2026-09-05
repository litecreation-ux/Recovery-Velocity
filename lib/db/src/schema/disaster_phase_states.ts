import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const disasterPhaseStatesTable = pgTable("disaster_phase_states", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code").notNull(),
  administrativeUnitId: text("administrative_unit_id"),
  phase: text("phase").notNull(),
  decisionSource: text("decision_source").notNull(),
  reason: text("reason").notNull(),
  decidedByRole: text("decided_by_role").notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const insertDisasterPhaseStateSchema = createInsertSchema(disasterPhaseStatesTable).omit({
  id: true,
  decidedAt: true,
});
export type DisasterPhaseState = typeof disasterPhaseStatesTable.$inferSelect;
export type InsertDisasterPhaseState = z.infer<typeof insertDisasterPhaseStateSchema>;