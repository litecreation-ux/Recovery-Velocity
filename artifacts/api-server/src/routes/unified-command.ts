import { clerkClient, getAuth } from "@clerk/express";
import { db, auditLogTable, unifiedCommandWorkspacesTable, type UnifiedCommandWorkspaceRow } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { Router, type Request } from "express";
import { PARISHES } from "../lib/parishes-data.js";
import { resolveOperatorAuthority } from "../lib/operator-authority.js";
import { logger } from "../lib/logger.js";
import { isDemoAuthorityEnabled } from "../lib/demo-authority.js";
import {
  AidExpirationNotificationDispatchError,
  sendAidExpirationNotification,
  type AidExpirationNotificationDispatcher,
} from "../lib/aid-expiration-notification-dispatcher.js";
import {
  formatAidExpirationWindow,
  buildAidExpirationNotification,
  getAidConfirmationExpirationWarning,
  isAidConfirmationExpired,
  isSafeAiAidTransition,
  validateAidConfirmationInput,
  type AidExpirationNotificationChannel,
  type AidExpirationNotificationDelivery,
} from "../lib/unified-command-aid.js";

type Authority = { role: string; parishId?: string; name: string };
type JsonRecord = Record<string, unknown>;

export const WORKSPACE_ID = "jamaica-national-response";
const COORDINATORS = new Set(["national_coordinator", "parish_manager"]);
const PARTICIPANTS = new Set(["national_coordinator", "parish_manager", "field_officer"]);
let notificationDispatcher: AidExpirationNotificationDispatcher = sendAidExpirationNotification;

export function setAidExpirationNotificationDispatcherForTests(
  dispatcher: AidExpirationNotificationDispatcher,
) {
  notificationDispatcher = dispatcher;
}

export function resetAidExpirationNotificationDispatcherForTests() {
  notificationDispatcher = sendAidExpirationNotification;
}

function configuredNotificationChannels(): AidExpirationNotificationChannel[] {
  const recipient = process.env.INCIDENT_COMMAND_ALERT_EMAIL?.trim();
  const sender = process.env.SENDGRID_FROM_EMAIL?.trim();
  if (!recipient || !sender) return [];
  return [{
    id: "incident-command-email",
    label: "Incident Command email",
    kind: "email",
    status: "active",
    approved: true,
    transport: "sendgrid",
    recipient,
  }];
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function now() {
  return new Date().toISOString();
}

function demoAuthority(req: Request): Authority | null {
  if (!isDemoAuthorityEnabled()) return null;
  const role = req.header("x-rvp-demo-role");
  if (!role || !PARTICIPANTS.has(role)) return null;
  if (role === "national_coordinator") return { role, name: "Incident Commander" };
  if (role === "parish_manager") return { role, parishId: "st-elizabeth", name: "St. Elizabeth Ops Section Chief" };
  return { role, parishId: "st-elizabeth", name: "Officer James" };
}

async function authority(req: Request): Promise<Authority | null> {
  const demo = demoAuthority(req);
  if (demo) return demo;
  const { userId } = getAuth(req);
  if (!userId) return null;
  const user = await clerkClient.users.getUser(userId);
  const resolved = resolveOperatorAuthority(
    user.privateMetadata,
    (parishId) => PARISHES.some((parish) => parish.id === parishId),
  );
  if (!resolved || !PARTICIPANTS.has(resolved.role)) return null;
  return {
    ...resolved,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || `Operator ${userId.slice(-6)}`,
  };
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object") : [];
}

function seedWorkspace(): typeof unifiedCommandWorkspacesTable.$inferInsert {
  const joined = "2026-08-30T11:00:00.000Z";
  return {
    id: WORKSPACE_ID,
    name: "Jamaica Unified Command",
    incidentName: "Tropical Storm Cora — Operational Period 2",
    countryCode: "JM",
    parishId: "st-elizabeth",
    status: "active",
    members: [
      { id: "m-ic", name: "Alicia Morgan", role: "Incident Commander", agency: "ODPEM", icsFunction: "Command", contactChannel: "Command radio 1", joinedAt: joined, status: "active", scope: "National coordination" },
      { id: "m-ops", name: "Marcus Bennett", role: "Ops Section Chief", agency: "St. Elizabeth Municipal Corporation", icsFunction: "Operations", contactChannel: "OPS talkgroup", joinedAt: joined, status: "active", scope: "St. Elizabeth" },
      { id: "m-field", name: "Officer James", role: "Field Unit Leader", agency: "Jamaica Constabulary Force", icsFunction: "Operations", contactChannel: "Field radio 4", joinedAt: joined, status: "active", scope: "Black River zone" },
      { id: "m-log", name: "Simone Clarke", role: "Logistics Lead", agency: "Jamaica Defence Force", icsFunction: "Logistics", contactChannel: "Logistics radio 2", joinedAt: joined, status: "standby", scope: "National staging" },
      { id: "m-plan", name: "David Henry", role: "Situation Unit", agency: "Meteorological Service of Jamaica", icsFunction: "Planning", contactChannel: "Planning channel", joinedAt: joined, status: "offline", scope: "National weather intelligence" },
    ],
    boundaries: [
      { id: "b-1", responsibleAgency: "St. Elizabeth Municipal Corporation", scopeType: "geographic", scope: "St. Elizabeth parish operations", handoffState: "retained", verificationStatus: "verified", lastVerifiedAt: "2026-08-30T15:30:00.000Z", note: "Parish emergency operations remain under local lead with national support." },
      { id: "b-2", responsibleAgency: "Jamaica Defence Force", scopeType: "functional", scope: "Heavy lift and national staging", handoffState: "in_progress", verificationStatus: "stale", lastVerifiedAt: "2026-08-30T11:00:00.000Z", note: "Air-movement authority awaiting operational-period confirmation." },
    ],
    objectives: [
      { id: "o-1", title: "Protect isolated communities before nightfall", description: "Confirm access, medical needs, and safe routes for Black River and New Market.", priority: "critical", status: "active", owner: "Ops Section Chief", operationalPeriod: "OP 2 · 12:00–20:00", pinned: true, linkedTaskIds: [], createdAt: joined },
      { id: "o-2", title: "Stabilize essential supply movement", description: "Keep verified fuel, water, and medical commitments moving to approved destinations.", priority: "high", status: "active", owner: "Logistics Lead", operationalPeriod: "OP 2 · 12:00–20:00", pinned: true, linkedTaskIds: [], createdAt: joined },
    ],
    mutualAid: [
      { id: "a-1", requester: "St. Elizabeth EOC", provider: "Jamaica Defence Force", resource: "High-clearance vehicles", quantity: 4, unit: "vehicles", destination: "Black River staging area", status: "committed", approval: "approved", eta: "2026-08-30T18:15:00.000Z", resourceDeclarationId: null, createdAt: joined },
    ],
    communications: [
      { id: "c-1", author: "Marcus Bennett", agency: "St. Elizabeth Municipal Corporation", channel: "OPS talkgroup", message: "Black River access team checked in. Northern approach remains passable for high-clearance vehicles only.", timestamp: "2026-08-30T16:02:00.000Z", objectiveId: "o-1", taskId: null, acknowledgements: ["Incident Commander"] },
    ],
    notificationChannels: configuredNotificationChannels(),
    aidExpirationNotificationChannelId: null,
    notificationDeliveries: [],
    externalAgencies: [
      { id: "e-1", agency: "Jamaica Red Cross", status: "active", capacity: "2 assessment teams and 1 shelter support team", needs: "Confirmed staging point", location: "Santa Cruz", lastVerifiedAt: "2026-08-30T15:45:00.000Z", verificationStatus: "verified", evidenceReferences: ["Radio check-in RC-204"] },
      { id: "e-2", agency: "National Water Commission", status: "standby", capacity: "Water quality team", needs: "Road access confirmation", location: "Black River depot", lastVerifiedAt: "2026-08-30T10:30:00.000Z", verificationStatus: "stale", evidenceReferences: [] },
    ],
    accessEvents: [
      { id: "x-1", action: "workspace_created", actor: "Incident Commander", subject: "Jamaica Unified Command", timestamp: joined, detail: "Operational workspace activated for the current incident." },
    ],
  };
}

export async function getWorkspace(workspaceId: string) {
  let [row] = await db.select().from(unifiedCommandWorkspacesTable).where(eq(unifiedCommandWorkspacesTable.id, workspaceId));
  if (!row && workspaceId === WORKSPACE_ID) {
    [row] = await db.insert(unifiedCommandWorkspacesTable).values(seedWorkspace()).returning();
  } else if (row && row.id === WORKSPACE_ID && !row.parishId) {
    [row] = await db.update(unifiedCommandWorkspacesTable)
      .set({ parishId: "st-elizabeth", updatedAt: new Date() })
      .where(eq(unifiedCommandWorkspacesTable.id, row.id))
      .returning();
  }
  const configuredChannels = configuredNotificationChannels();
  if (row && row.id === WORKSPACE_ID
    && JSON.stringify(records(row.notificationChannels)) !== JSON.stringify(configuredChannels)) {
    const selectedChannelId = configuredChannels.some((channel) =>
      channel.id === row.aidExpirationNotificationChannelId)
      ? row.aidExpirationNotificationChannelId
      : null;
    [row] = await db.update(unifiedCommandWorkspacesTable)
      .set({
        notificationChannels: configuredChannels,
        aidExpirationNotificationChannelId: selectedChannelId,
        updatedAt: new Date(),
      })
      .where(eq(unifiedCommandWorkspacesTable.id, row.id))
      .returning();
  }
  return row;
}

async function expireAidConfirmations(row: UnifiedCommandWorkspaceRow) {
  const checkedAt = new Date();
  const aids = records(row.mutualAid);
  const expired = aids.filter((aid) => {
    const confirmation = aid.confirmation;
    return confirmation
      && typeof confirmation === "object"
      && (confirmation as JsonRecord).status !== "expired"
      && isAidConfirmationExpired(aid, checkedAt);
  });
  const warnings = aids.filter((aid) => {
    if (typeof aid.expirationWarningSentAt === "string" && aid.expirationWarningSentAt) return false;
    return Boolean(getAidConfirmationExpirationWarning(aid, checkedAt));
  });
  const activeWarnings = aids.flatMap((aid) => {
    const warning = getAidConfirmationExpirationWarning(aid, checkedAt);
    return warning ? [{ aid, warning }] : [];
  });
  const channels = records(row.notificationChannels) as AidExpirationNotificationChannel[];
  const selectedChannelId = typeof row.aidExpirationNotificationChannelId === "string"
    ? row.aidExpirationNotificationChannelId
    : null;
  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId);
  const existingDeliveries = records(row.notificationDeliveries) as AidExpirationNotificationDelivery[];
  const stalePendingKeys = new Set(existingDeliveries
    .filter((delivery) => delivery.status === "pending"
      && new Date(delivery.attemptedAt).getTime() <= checkedAt.getTime() - 5 * 60_000)
    .map((delivery) => delivery.warningKey));
  const recoveredDeliveries = existingDeliveries.map((delivery) =>
    stalePendingKeys.has(delivery.warningKey)
      ? {
        ...delivery,
        status: "unknown" as const,
        error: "Provider submission outcome is unknown after an interrupted delivery attempt; automatic retry is disabled.",
      }
      : delivery);
  const deliveryCandidates = selectedChannel
    ? activeWarnings.filter(({ warning }) => {
      return !existingDeliveries.some((delivery) => delivery.warningKey === warning.warningKey);
    })
    : [];
  if (expired.length === 0 && warnings.length === 0 && deliveryCandidates.length === 0 && stalePendingKeys.size === 0) return row;

  const expirationEvents = expired.map((aid) => {
    const confirmation = aid.confirmation as JsonRecord;
    return {
      id: id("x"),
      action: "aid_confirmation_expired",
      actor: "Unified Command system",
      subject: String(aid.resource ?? aid.id),
      timestamp: checkedAt.toISOString(),
      detail: `Counterpart confirmation ${String(confirmation.reference ?? "unknown")} from ${String(confirmation.provider ?? "unknown provider")} expired at ${String(confirmation.expiresAt ?? "unknown time")}; approval and commitment were revoked.`,
    };
  });
  const warningEvents = warnings.map((aid) => {
    const warning = getAidConfirmationExpirationWarning(aid, checkedAt);
    const confirmation = aid.confirmation as JsonRecord;
    if (!warning) throw new Error("Aid expiration warning disappeared during lifecycle evaluation");
    return {
      id: id("x"),
      action: "aid_confirmation_expiration_warning",
      actor: "Unified Command system",
      subject: String(aid.resource ?? aid.id),
      timestamp: checkedAt.toISOString(),
      detail: `Counterpart confirmation ${warning.reference} from ${warning.provider} for ${String(aid.resource ?? aid.id)} remains valid for ${formatAidExpirationWindow(warning.remainingMs)} (expires ${warning.expiresAt}). Renew evidence before the committed movement is cancelled.`,
      confirmationReference: String(confirmation.reference ?? warning.reference),
    };
  });
  const deliveryAttempts = deliveryCandidates.map(({ aid, warning }) => {
    const attemptedAt = checkedAt.toISOString();
    const notification = buildAidExpirationNotification(warning, aid);
    const destinationId = String(selectedChannel?.id ?? selectedChannelId ?? "unknown");
    return {
      delivery: {
        aidId: String(aid.id),
        warningKey: warning.warningKey,
        destinationId,
        status: "pending" as const,
        attempts: 1,
        attemptedAt,
        deliveredAt: null,
        providerMessageId: null,
        error: null,
      },
      channel: selectedChannel!,
      notification,
    };
  });
  const deliveryResults = deliveryAttempts.map(({ delivery }) => delivery);
  const staleDeliveryAuditEvents = recoveredDeliveries
    .filter((delivery) => stalePendingKeys.has(delivery.warningKey))
    .map((delivery) => ({
      actor: "Unified Command system",
      action: "aid_expiration_warning_delivery_unknown",
      detail: `Advance aid-expiration warning delivery outcome is unknown for approved destination ${delivery.destinationId}; automatic retry was suppressed.`,
    }));
  const expiredIds = new Set(expired.map((aid) => aid.id));
  const warningIds = new Set(warnings.map((aid) => aid.id));
  const nextAid = aids.map((aid) => {
    if (expiredIds.has(aid.id)) {
      const current = aid.confirmation as JsonRecord;
      const expiredConfirmation = {
        ...current,
        status: "expired",
        recordedBy: "Unified Command system",
        recordedAt: checkedAt.toISOString(),
      };
      const history = Array.isArray(aid.confirmationHistory) ? aid.confirmationHistory : [];
      return {
        ...aid,
        approval: "declined",
        status: "cancelled",
        confirmation: expiredConfirmation,
        confirmationHistory: [...history, expiredConfirmation],
      };
    }
    if (warningIds.has(aid.id)) {
      return { ...aid, expirationWarningSentAt: checkedAt.toISOString() };
    }
    return aid;
  });
  const lifecycleEvents = [...warningEvents, ...expirationEvents];
  const deliveryByWarning = new Map(deliveryResults.map((delivery) => [delivery.warningKey, delivery]));
  const nextDeliveries = [
    ...recoveredDeliveries.filter((delivery) => !deliveryByWarning.has(delivery.warningKey)),
    ...deliveryResults,
  ];
  const accessEvents = [...records(row.accessEvents), ...lifecycleEvents].slice(-100);
  const updated = await db.transaction(async (tx) => {
    const [next] = await tx.update(unifiedCommandWorkspacesTable)
      .set({
        mutualAid: nextAid,
        accessEvents,
        notificationDeliveries: nextDeliveries,
        revision: sql`${unifiedCommandWorkspacesTable.revision} + 1`,
        updatedAt: checkedAt,
      })
      .where(and(
        eq(unifiedCommandWorkspacesTable.id, row.id),
        eq(unifiedCommandWorkspacesTable.revision, row.revision),
      ))
      .returning();
    if (!next) return null;
    await tx.insert(auditLogTable).values([
      ...lifecycleEvents.map((event) => ({
      agentName: event.actor,
      action: `Unified Command: ${event.action}`,
      parishId: row.parishId ?? "national",
      parishName: row.parishId ? "St. Elizabeth" : "Jamaica",
      details: event.detail,
      })),
      ...staleDeliveryAuditEvents.map((event) => ({
        agentName: event.actor,
        action: `Unified Command: ${event.action}`,
        parishId: row.parishId ?? "national",
        parishName: row.parishId ? "St. Elizabeth" : "Jamaica",
        details: event.detail,
      })),
    ]);
    return next;
  });
  if (updated) {
    for (const attempt of deliveryAttempts) {
      let result: { providerMessageId: string | null } | null = null;
      let error: string | null = null;
      let outcome: "failed" | "unknown" = "unknown";
      try {
        result = await notificationDispatcher(attempt.channel, attempt.notification);
      } catch (err) {
        error = err instanceof Error ? err.message.slice(0, 240) : "Notification provider failed.";
        if (err instanceof AidExpirationNotificationDispatchError) outcome = err.outcome;
      }
      await finalizeAidExpirationDelivery(
        row.id,
        attempt.delivery.warningKey,
        result,
        error,
        outcome,
        attempt.notification,
      );
    }
    const [latest] = await db.select().from(unifiedCommandWorkspacesTable)
      .where(eq(unifiedCommandWorkspacesTable.id, row.id));
    return latest ?? updated;
  }
  const [latest] = await db.select().from(unifiedCommandWorkspacesTable)
    .where(eq(unifiedCommandWorkspacesTable.id, row.id));
  return latest ?? row;
}

async function finalizeAidExpirationDelivery(
  workspaceId: string,
  warningKey: string,
  result: { providerMessageId: string | null } | null,
  error: string | null,
  errorOutcome: "failed" | "unknown",
  notification: { subject: string; message: string },
) {
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(unifiedCommandWorkspacesTable)
      .where(eq(unifiedCommandWorkspacesTable.id, workspaceId))
      .for("update");
    if (!row) return;
    const deliveries = records(row.notificationDeliveries) as AidExpirationNotificationDelivery[];
    const index = deliveries.findIndex((delivery) =>
      delivery.warningKey === warningKey && delivery.status === "pending");
    if (index < 0) return;
    const current = deliveries[index];
    const completedAt = new Date();
    const delivered = Boolean(result && !error);
    const nextDelivery: AidExpirationNotificationDelivery = {
      ...current,
      status: delivered ? "delivered" : errorOutcome,
      deliveredAt: delivered ? completedAt.toISOString() : null,
      providerMessageId: result?.providerMessageId ?? null,
      error: delivered ? null : error ?? "Notification provider failed.",
    };
    deliveries[index] = nextDelivery;
    const channel = (records(row.notificationChannels) as AidExpirationNotificationChannel[])
      .find((item) => item.id === current.destinationId);
    const communication = delivered ? {
      id: id("c"),
      author: "Unified Command system",
      agency: "ODPEM",
      channel: channel?.label ?? current.destinationId,
      message: `${notification.subject}\n${notification.message}`,
      timestamp: completedAt.toISOString(),
      objectiveId: null,
      taskId: null,
      acknowledgements: [],
      visibility: "incident_command",
      notificationWarningKey: warningKey,
    } : null;
    const auditAction = delivered
      ? "aid_expiration_warning_delivery_succeeded"
      : errorOutcome === "failed"
        ? "aid_expiration_warning_delivery_failed"
        : "aid_expiration_warning_delivery_unknown";
    const auditDetail = delivered
      ? `Advance aid-expiration warning accepted by provider for approved destination ${current.destinationId}.`
      : `Advance aid-expiration warning delivery failed for approved destination ${current.destinationId}: ${nextDelivery.error}`;
    const [saved] = await tx.update(unifiedCommandWorkspacesTable)
      .set({
        notificationDeliveries: deliveries,
        communications: communication
          ? [...records(row.communications), communication].slice(-100)
          : records(row.communications),
        revision: sql`${unifiedCommandWorkspacesTable.revision} + 1`,
        updatedAt: completedAt,
      })
      .where(eq(unifiedCommandWorkspacesTable.id, row.id))
      .returning();
    if (!saved) {
      logger.error({ workspaceId, warningKey }, "Unified Command could not finalize aid expiration notification delivery");
      return;
    }
    await tx.insert(auditLogTable).values({
      agentName: "Unified Command system",
      action: `Unified Command: ${auditAction}`,
      parishId: row.parishId ?? "national",
      parishName: row.parishId ? "St. Elizabeth" : "Jamaica",
      details: auditDetail,
    });
  });
}

async function monitorAidConfirmations() {
  try {
    const rows = await db.select().from(unifiedCommandWorkspacesTable);
    for (const row of rows) await expireAidConfirmations(row);
  } catch (err) {
    logger.error({ err }, "Unified Command aid confirmation lifecycle sweep failed");
  }
}

export function startAidConfirmationMonitor() {
  void monitorAidConfirmations();
  setInterval(() => void monitorAidConfirmations(), 30_000);
}

function canAccess(row: UnifiedCommandWorkspaceRow, actor: Authority) {
  return actor.role === "national_coordinator"
    || (Boolean(actor.parishId) && row.parishId === actor.parishId);
}

function present(row: UnifiedCommandWorkspaceRow, actor: Authority) {
  const checkedAt = new Date();
  const expirationWarnings = records(row.mutualAid).flatMap((aid) => {
    const sentAt = typeof aid.expirationWarningSentAt === "string" ? aid.expirationWarningSentAt : null;
    const warning = sentAt ? getAidConfirmationExpirationWarning(aid, checkedAt) : null;
    if (!warning) return [];
    return [{
      aidId: String(aid.id),
      warningKey: warning.warningKey,
      resource: String(aid.resource ?? aid.id),
      unit: String(aid.unit ?? ""),
      provider: warning.provider,
      reference: warning.reference,
      expiresAt: warning.expiresAt,
      remainingMs: warning.remainingMs,
      warnedAt: sentAt,
    }];
  });
  const capabilities = actor.role === "national_coordinator"
    ? ["view", "coordinate", "manage_access"]
    : actor.role === "parish_manager" ? ["view", "coordinate"] : ["view"];
  return {
    id: row.id,
    name: row.name,
    incidentName: row.incidentName,
    countryCode: row.countryCode,
    parishId: row.parishId ?? null,
    status: row.status,
    currentActor: { name: actor.name, role: actor.role, parishId: actor.parishId ?? null },
    capabilities,
    members: records(row.members)
      .filter((member) => member.status !== "removed")
      .map(({ email: _email, ...member }) => member),
    boundaries: records(row.boundaries),
    objectives: records(row.objectives),
    mutualAid: records(row.mutualAid),
    communications: records(row.communications)
      .filter((message) => message.visibility !== "incident_command" || actor.role === "national_coordinator")
      .map(({ visibility: _visibility, notificationWarningKey: _notificationWarningKey, ...message }) => message),
    notificationChannels: actor.role === "national_coordinator"
      ? (records(row.notificationChannels) as AidExpirationNotificationChannel[]).map((channel) => ({
        id: channel.id,
        label: channel.label,
        kind: channel.kind,
        status: channel.status,
        approved: channel.approved,
      }))
      : [],
    aidExpirationNotificationChannelId: actor.role === "national_coordinator"
      ? row.aidExpirationNotificationChannelId ?? null
      : null,
    notificationDeliveries: actor.role === "national_coordinator"
      ? records(row.notificationDeliveries)
      : [],
    externalAgencies: records(row.externalAgencies),
    accessEvents: records(row.accessEvents).slice(-25).reverse(),
    expirationWarnings,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function text(body: JsonRecord, key: string, required = true) {
  const value = body[key];
  if (typeof value !== "string" || (required && !value.trim())) return required ? null : "";
  return value.trim();
}

const router = Router();

router.get("/unified-command/:workspaceId", async (req, res): Promise<void> => {
  const actor = await authority(req);
  if (!actor) {
    res.status(401).json({ error: "Sign in with approved operational access to open Unified Command" });
    return;
  }
  let row = await getWorkspace(req.params.workspaceId);
  if (!row) {
    res.status(404).json({ error: "Unified Command workspace not found" });
    return;
  }
  if (!canAccess(row, actor)) {
    res.status(403).json({ error: "This workspace is outside your assigned parish scope" });
    return;
  }
  row = await expireAidConfirmations(row);
  res.json(present(row, actor));
});

router.post("/unified-command/:workspaceId", async (req, res): Promise<void> => {
  const actor = await authority(req);
  if (!actor) {
    res.status(401).json({ error: "Authentication is required" });
    return;
  }
  if (!COORDINATORS.has(actor.role)) {
    res.status(403).json({ error: "Your workspace role is view-only" });
    return;
  }
  let row = await getWorkspace(req.params.workspaceId);
  if (!row) {
    res.status(404).json({ error: "Unified Command workspace not found" });
    return;
  }
  if (!canAccess(row, actor)) {
    res.status(403).json({ error: "This workspace is outside your assigned parish scope" });
    return;
  }
  row = await expireAidConfirmations(row);
  const body = req.body as JsonRecord;
  const type = text(body, "type");
  if (!type) {
    res.status(400).json({ error: "A workspace action type is required" });
    return;
  }

  const patch: Partial<typeof unifiedCommandWorkspacesTable.$inferInsert> = {};
  let subject = "";
  const extraEvents: Array<{
    id: string;
    action: string;
    actor: string;
    subject: string;
    timestamp: string;
    detail: string;
  }> = [];
  const requireRecord = (items: JsonRecord[]) => {
    const recordId = text(body, "recordId");
    const index = recordId ? items.findIndex((item) => item.id === recordId) : -1;
    return { items, index, recordId };
  };

  if (type === "create_objective") {
    const title = text(body, "title");
    const description = text(body, "description");
    if (!title || !description) return void res.status(400).json({ error: "Objective title and description are required" });
    subject = title;
    const priority = text(body, "priority", false) || "high";
    if (!["critical", "high", "medium"].includes(priority)) return void res.status(400).json({ error: "Objective priority is invalid" });
    patch.objectives = [...records(row.objectives), { id: id("o"), title, description, priority, status: "active", owner: text(body, "owner", false) || actor.name, operationalPeriod: text(body, "operationalPeriod", false) || "Current operational period", pinned: true, linkedTaskIds: [], createdAt: now() }];
  } else if (type === "post_message") {
    const message = text(body, "message");
    if (!message) return void res.status(400).json({ error: "Message text is required" });
    subject = "Inter-agency communication";
    patch.communications = [...records(row.communications), { id: id("c"), author: actor.name, agency: actor.role === "national_coordinator" ? "ODPEM" : "St. Elizabeth Municipal Corporation", channel: text(body, "channel", false) || "Unified Command", message, timestamp: now(), objectiveId: text(body, "objectiveId", false) || null, taskId: text(body, "taskId", false) || null, acknowledgements: [] }];
  } else if (type === "create_aid") {
    const requester = text(body, "requester"); const provider = text(body, "provider"); const resource = text(body, "resource"); const destination = text(body, "destination"); const unit = text(body, "unit");
    if (!requester || !provider || !resource || !destination || !unit || typeof body.quantity !== "number" || body.quantity <= 0) return void res.status(400).json({ error: "Requester, provider, resource, positive quantity, unit, and destination are required" });
    subject = resource;
    patch.mutualAid = [...records(row.mutualAid), { id: id("a"), requester, provider, planningCandidates: [], resource, quantity: body.quantity, unit, destination, status: "requested", approval: "pending", eta: null, resourceDeclarationId: null, createdAt: now() }];
  } else if (type === "configure_aid_expiration_notifications") {
    if (actor.role !== "national_coordinator") {
      return void res.status(403).json({ error: "Only the Incident Commander may configure aid-expiration notifications" });
    }
    const notificationChannelId = text(body, "notificationChannelId");
    if (!notificationChannelId) return void res.status(400).json({ error: "An approved notification destination is required" });
    const channel = (records(row.notificationChannels) as AidExpirationNotificationChannel[])
      .find((candidate) => candidate.id === notificationChannelId);
    if (!channel) return void res.status(400).json({ error: "That notification destination is not approved for this workspace" });
    if (!channel.approved || channel.status !== "active") {
      return void res.status(400).json({ error: "Choose an approved active notification destination" });
    }
    patch.aidExpirationNotificationChannelId = channel.id;
    subject = channel.label;
    extraEvents.push({
      id: id("x"),
      action: "aid_expiration_notification_channel_configured",
      actor: actor.name,
      subject,
      timestamp: now(),
      detail: `Aid-expiration warnings will be delivered through approved active destination ${channel.id}.`,
    });
  } else if (type === "confirm_aid") {
    if (actor.role !== "national_coordinator") {
      return void res.status(403).json({ error: "Only the Incident Commander may record or replace official counterpart confirmation" });
    }
    const target = requireRecord(records(row.mutualAid));
    if (target.index < 0) return void res.status(404).json({ error: "Mutual aid record not found" });
    const aid = target.items[target.index];
    const recordedAt = new Date();
    const requestedQuantity = typeof aid.requestedQuantity === "number" ? aid.requestedQuantity : aid.quantity;
    const result = validateAidConfirmationInput({
      reference: body.confirmationReference,
      source: body.confirmationSource,
      confirmedAt: body.confirmationTimestamp,
      provider: body.confirmationProvider,
      acceptedQuantity: body.acceptedQuantity,
      expiresAt: body.confirmationExpiresAt,
    }, requestedQuantity, actor.name, recordedAt);
    if (result.error || !result.confirmation) return void res.status(400).json({ error: result.error ?? "Confirmation evidence is invalid" });
    const requestedStatus = text(body, "status", false) || "requested";
    if (!["requested", "committed"].includes(requestedStatus)) {
      return void res.status(400).json({ error: "A verified acceptance can remain requested or move to committed" });
    }
    const previousConfirmation = aid.confirmation && typeof aid.confirmation === "object"
      ? aid.confirmation as JsonRecord
      : null;
    const confirmation = result.confirmation;
    const confirmationHistory = Array.isArray(aid.confirmationHistory) ? aid.confirmationHistory : [];
    const nextAid = {
      ...aid,
      provider: confirmation.provider,
      requestedQuantity,
      quantity: confirmation.status === "rejected" ? requestedQuantity : confirmation.acceptedQuantity,
      confirmation,
      confirmationHistory: [...confirmationHistory, confirmation],
      expirationWarningSentAt: null,
      approval: confirmation.status === "rejected" ? "declined" : "approved",
      status: confirmation.status === "rejected" ? "cancelled" : requestedStatus,
    };
    target.items[target.index] = nextAid;
    patch.mutualAid = target.items;
    subject = String(aid.resource ?? aid.id);
    const outcomeLabel = confirmation.status === "partial" ? "partial acceptance"
      : confirmation.status === "rejected" ? "rejection" : "full acceptance";
    const action = previousConfirmation ? "aid_confirmation_updated" : "aid_confirmation_recorded";
    extraEvents.push({
      id: id("x"),
      action,
      actor: actor.name,
      subject,
      timestamp: now(),
       detail: `${outcomeLabel} from ${confirmation.provider}; ${confirmation.acceptedQuantity} of ${requestedQuantity} ${aid.unit} accepted. Current evidence: reference ${confirmation.reference}; source ${confirmation.source}; confirmed ${confirmation.confirmedAt}; expires ${confirmation.expiresAt ?? "not specified"}.${previousConfirmation ? ` Replaced evidence: reference ${String(previousConfirmation.reference ?? "unknown")}; source ${String(previousConfirmation.source ?? "unknown")}; provider ${String(previousConfirmation.provider ?? "unknown")}; accepted quantity ${String(previousConfirmation.acceptedQuantity ?? "unknown")}; confirmed ${String(previousConfirmation.confirmedAt ?? "unknown")}; expires ${String(previousConfirmation.expiresAt ?? "not specified")}.` : ""}`,
    });
  } else if (type === "acknowledge_message") {
    const target = requireRecord(records(row.communications));
    if (target.index < 0) return void res.status(404).json({ error: "Communication not found" });
    const item = target.items[target.index]; const acknowledgements = Array.isArray(item.acknowledgements) ? item.acknowledgements as string[] : [];
    target.items[target.index] = { ...item, acknowledgements: [...new Set([...acknowledgements, actor.name])] };
    patch.communications = target.items; subject = "Communication acknowledgement";
  } else if (type === "update_objective" || type === "update_aid" || type === "update_agency" || type === "update_boundary" || type === "update_member") {
    if (type === "update_member" && actor.role !== "national_coordinator") return void res.status(403).json({ error: "Only Incident Command may change workspace access" });
    const key = type === "update_objective" ? "objectives" : type === "update_aid" ? "mutualAid" : type === "update_agency" ? "externalAgencies" : type === "update_boundary" ? "boundaries" : "members";
    const target = requireRecord(records(row[key as keyof UnifiedCommandWorkspaceRow]));
    if (target.index < 0) return void res.status(404).json({ error: "Workspace record not found" });
    const rules: Record<string, Record<string, string[] | true>> = {
      update_objective: { status: ["active", "achieved", "deferred"], owner: true },
      update_aid: { status: ["requested", "committed", "en_route", "delivered", "cancelled"], approval: ["pending", "approved", "declined"], eta: true },
      update_agency: { status: ["requested", "active", "standby", "offline", "unverified"], verificationStatus: ["verified", "stale", "unverified"], capacity: true, needs: true, location: true },
      update_boundary: { handoffState: ["retained", "requested", "in_progress", "complete"], verificationStatus: ["verified", "stale", "unverified"], responsibleAgency: true },
      update_member: { status: ["active", "standby", "offline", "suspended", "removed", "invited"], role: true, icsFunction: ["Command", "Operations", "Planning", "Logistics", "Finance"], contactChannel: true, scope: true },
    };
    const changes: JsonRecord = {};
    for (const [field, rule] of Object.entries(rules[type])) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== "string" || !body[field].trim() || (Array.isArray(rule) && !rule.includes(body[field].trim()))) {
        return void res.status(400).json({ error: `Invalid ${field} for ${type.replaceAll("_", " ")}` });
      }
      changes[field] = body[field].trim();
    }
    if (Object.keys(changes).length === 0) return void res.status(400).json({ error: "No valid changes were provided" });
    if (type === "update_aid" && !isSafeAiAidTransition(target.items[target.index], changes)) {
      return void res.status(400).json({
        error: "AI-assisted planning requests cannot be approved, committed, or dispatched without a separate verified counterpart confirmation record.",
      });
    }
    target.items[target.index] = { ...target.items[target.index], ...changes, ...(type === "update_agency" || type === "update_boundary" ? { lastVerifiedAt: now() } : {}) };
    Object.assign(patch, { [key]: target.items });
    subject = String(target.items[target.index].name ?? target.items[target.index].title ?? target.items[target.index].agency ?? type);
  } else if (type === "invite_member") {
    if (actor.role !== "national_coordinator") return void res.status(403).json({ error: "Only Incident Command may invite workspace members" });
    const email = text(body, "email"); const name = text(body, "name"); const role = text(body, "role"); const roleTitle = text(body, "roleTitle"); const agency = text(body, "agency"); const icsFunction = text(body, "icsFunction"); const contactChannel = text(body, "contactChannel"); const scope = text(body, "scope");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return void res.status(400).json({ error: "A valid invite email is required" });
    if (!name || !role || !roleTitle || !agency || !icsFunction || !contactChannel || !scope) return void res.status(400).json({ error: "Email, name, role, role title, agency, ICS function, contact channel, and scope are required" });
    if (!["parish_manager", "field_officer"].includes(role)) return void res.status(400).json({ error: "Select a valid workspace role" });
    if (!["Command", "Operations", "Planning", "Logistics", "Finance"].includes(icsFunction)) return void res.status(400).json({ error: "Select a valid ICS function" });
    subject = name;
    patch.members = [...records(row.members), { id: id("m"), name, role: roleTitle, accessRole: role, agency, icsFunction, contactChannel, joinedAt: now(), status: "invited", scope, email }];
  } else {
    res.status(400).json({ error: "Unsupported workspace action" });
    return;
  }

  const accessEvent = { id: id("x"), action: type, actor: actor.name, subject, timestamp: now(), detail: `${type.replaceAll("_", " ")} recorded by ${actor.role}.` };
  const auditEvents = [...extraEvents, accessEvent];
  patch.accessEvents = [...records(row.accessEvents), ...auditEvents].slice(-100);
  const updated = await db.transaction(async (tx) => {
    const [next] = await tx.update(unifiedCommandWorkspacesTable)
      .set({
        ...patch,
        revision: sql`${unifiedCommandWorkspacesTable.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(unifiedCommandWorkspacesTable.id, row.id),
        eq(unifiedCommandWorkspacesTable.revision, row.revision),
      ))
      .returning();
    if (!next) return null;
     await tx.insert(auditLogTable).values(auditEvents.map((event) => ({
       agentName: event.actor,
       action: `Unified Command: ${event.action}`,
       parishId: actor.parishId ?? "national",
       parishName: actor.parishId ? "St. Elizabeth" : "Jamaica",
       details: event.detail,
     })));
    return next;
  });
  if (!updated) {
    res.status(409).json({ error: "The workspace changed while you were editing. Refresh and try again." });
    return;
  }
  const lifecycleUpdated = await expireAidConfirmations(updated);
  res.json(present(lifecycleUpdated, actor));
});

export default router;