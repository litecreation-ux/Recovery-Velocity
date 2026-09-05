import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const countriesTable = pgTable("countries", {
  id: serial("id").primaryKey(),
  iso3Code: text("iso3_code").notNull().unique(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const administrativeUnitsTable = pgTable("administrative_units", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code").notNull(),
  externalId: text("external_id").notNull().unique(),
  name: text("name").notNull(),
  level: text("level").notNull(),
  parentExternalId: text("parent_external_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCountrySchema = createInsertSchema(countriesTable).omit({
  id: true,
  createdAt: true,
});
export const insertAdministrativeUnitSchema = createInsertSchema(administrativeUnitsTable).omit({
  id: true,
  createdAt: true,
});
export type Country = typeof countriesTable.$inferSelect;
export type AdministrativeUnit = typeof administrativeUnitsTable.$inferSelect;
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type InsertAdministrativeUnit = z.infer<typeof insertAdministrativeUnitSchema>;