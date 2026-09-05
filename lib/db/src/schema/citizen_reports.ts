import { integer, pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const citizenReportsTable = pgTable("citizen_reports", {
  id: serial("id").primaryKey(),
  parishId: text("parish_id").notNull(),
  reporterName: text("reporter_name").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("other"),
  status: text("status").notNull().default("pending"),
  location: text("location"),
  photoObjectPath: text("photo_object_path"),
  photoContentType: text("photo_content_type"),
  photoSizeBytes: integer("photo_size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCitizenReportSchema = createInsertSchema(citizenReportsTable).omit({ id: true, createdAt: true });
export type InsertCitizenReport = z.infer<typeof insertCitizenReportSchema>;
export type CitizenReport = typeof citizenReportsTable.$inferSelect;
