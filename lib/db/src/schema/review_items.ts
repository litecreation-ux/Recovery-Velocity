import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewItemsTable = pgTable("review_items", {
  id: serial("id").primaryKey(),
  parishId: text("parish_id").notNull(),
  parishName: text("parish_name").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  status: text("status").notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewItemSchema = createInsertSchema(reviewItemsTable).omit({ id: true, createdAt: true, reviewedAt: true });
export type InsertReviewItem = z.infer<typeof insertReviewItemSchema>;
export type ReviewItem = typeof reviewItemsTable.$inferSelect;
