import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sourceRefreshesTable = pgTable("source_refreshes", {
  id: serial("id").primaryKey(),
  sourceKey: text("source_key").notNull(),
  countryCode: text("country_code"),
  status: text("status").notNull(),
  lastSuccessfulAt: timestamp("last_successful_at", { withTimezone: true }),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  detail: text("detail"),
});

export const insertSourceRefreshSchema = createInsertSchema(sourceRefreshesTable).omit({
  id: true,
  checkedAt: true,
});
export type SourceRefresh = typeof sourceRefreshesTable.$inferSelect;
export type InsertSourceRefresh = z.infer<typeof insertSourceRefreshSchema>;