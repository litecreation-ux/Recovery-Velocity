import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const unifiedCommandWorkspacesTable = pgTable("unified_command_workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  incidentName: text("incident_name").notNull(),
  countryCode: text("country_code").notNull().default("JM"),
  parishId: text("parish_id"),
  status: text("status").notNull().default("active"),
  revision: integer("revision").notNull().default(1),
  members: jsonb("members").notNull().default([]),
  boundaries: jsonb("boundaries").notNull().default([]),
  objectives: jsonb("objectives").notNull().default([]),
  mutualAid: jsonb("mutual_aid").notNull().default([]),
  communications: jsonb("communications").notNull().default([]),
  notificationChannels: jsonb("notification_channels").notNull().default([]),
  aidExpirationNotificationChannelId: text("aid_expiration_notification_channel_id"),
  notificationDeliveries: jsonb("notification_deliveries").notNull().default([]),
  externalAgencies: jsonb("external_agencies").notNull().default([]),
  accessEvents: jsonb("access_events").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UnifiedCommandWorkspaceRow = typeof unifiedCommandWorkspacesTable.$inferSelect;