import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const communicationsMessagesTable = pgTable("communications_messages", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  body: text("body").notNull(),
  priority: text("priority").notNull(),
  channel: text("channel").notNull(),
  deliveryState: text("delivery_state").notNull(),
  audience: text("audience").notNull().default("authorized_scope"),
  countryCode: text("country_code").notNull(),
  parishId: text("parish_id"),
  senderUserId: text("sender_user_id").notNull(),
  senderName: text("sender_name").notNull(),
  publicStatus: text("public_status"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedByUserId: text("approved_by_user_id"),
  approvedByName: text("approved_by_name"),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectedByUserId: text("rejected_by_user_id"),
  rejectedByName: text("rejected_by_name"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("communications_messages_sender_client_id_unique").on(table.senderUserId, table.clientId),
]);

export const communicationsAcknowledgementsTable = pgTable("communications_acknowledgements", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull(),
  userId: text("user_id").notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("communications_acknowledgements_message_user_unique").on(table.messageId, table.userId),
]);

export const radioTrafficLogsTable = pgTable("radio_traffic_logs", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  station: text("station").notNull(),
  direction: text("direction").notNull(),
  body: text("body").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  priority: text("priority").notNull(),
  countryCode: text("country_code").notNull(),
  parishId: text("parish_id"),
  recorderUserId: text("recorder_user_id").notNull(),
  recorderName: text("recorder_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("radio_traffic_logs_recorder_client_id_unique").on(table.recorderUserId, table.clientId),
]);

export const insertCommunicationsMessageSchema = createInsertSchema(communicationsMessagesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommunicationsMessage = z.infer<typeof insertCommunicationsMessageSchema>;
export type CommunicationsMessage = typeof communicationsMessagesTable.$inferSelect;
export type CommunicationsAcknowledgement = typeof communicationsAcknowledgementsTable.$inferSelect;
export type RadioTrafficLog = typeof radioTrafficLogsTable.$inferSelect;