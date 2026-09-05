import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const publicUploadGrantsTable = pgTable("public_upload_grants", {
  objectPath: text("object_path").primaryKey(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const publicRateLimitsTable = pgTable("public_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(1),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});