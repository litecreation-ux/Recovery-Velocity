import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const essentialOrganizationsTable = pgTable("essential_organizations", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code").notNull(),
  administrativeUnitId: text("administrative_unit_id"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  locationDescription: text("location_description").notNull(),
  directorySource: text("directory_source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businessContinuityUpdatesTable = pgTable("business_continuity_updates", {
  id: serial("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  status: text("status").notNull(),
  evidenceSource: text("evidence_source").notNull(),
  confidence: text("confidence").notNull(),
  note: text("note"),
  reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEssentialOrganizationSchema = createInsertSchema(essentialOrganizationsTable).omit({
  id: true,
  createdAt: true,
});
export const insertBusinessContinuityUpdateSchema = createInsertSchema(businessContinuityUpdatesTable).omit({
  id: true,
  reportedAt: true,
});
export type EssentialOrganization = typeof essentialOrganizationsTable.$inferSelect;
export type BusinessContinuityUpdate = typeof businessContinuityUpdatesTable.$inferSelect;
export type InsertEssentialOrganization = z.infer<typeof insertEssentialOrganizationSchema>;
export type InsertBusinessContinuityUpdate = z.infer<typeof insertBusinessContinuityUpdateSchema>;