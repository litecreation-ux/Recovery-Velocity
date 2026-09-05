import { clerkClient, getAuth } from "@clerk/express";
import {
  communicationsAcknowledgementsTable,
  communicationsMessagesTable,
  db,
  radioTrafficLogsTable,
} from "@workspace/db";
import {
  AcknowledgeCommunicationParams,
  AcknowledgeCommunicationResponse,
  CreateCommunicationBody,
  CreateCommunicationResponse,
  CreateRadioTrafficBody,
  CreateRadioTrafficResponse,
  ListCommunicationsQueryParams,
  ListCommunicationsResponse,
  ListPendingPublicAlertsResponse,
  ListPublicAlertsQueryParams,
  ListPublicAlertsResponse,
  ListRadioTrafficQueryParams,
  ListRadioTrafficResponse,
  ReviewPublicAlertBody,
  ReviewPublicAlertParams,
  ReviewPublicAlertResponse,
} from "@workspace/api-zod";
import { and, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import { PARISHES } from "../lib/parishes-data.js";
import { resolveOperatorAuthority, type OperatorAuthority } from "../lib/operator-authority.js";
import { canReviewPublicAlert, canViewAudience, type CommunicationAudience } from "../lib/communications-policy.js";
import { publishCommunicationRefresh, subscribeToCommunicationEvents } from "../lib/communications-events.js";

const router: IRouter = Router();
const COMMUNICATION_ROLES = new Set([
  "system_admin", "national_coordinator", "parish_manager", "field_officer", "private_sector_partner",
]);

type Actor = { userId: string; name: string; authority: OperatorAuthority };

function communicationResponse(message: typeof communicationsMessagesTable.$inferSelect, acknowledgementCount: number, acknowledgedByCurrentUser: boolean) {
  return {
    ...message,
    parishId: message.parishId ?? null,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    publicStatus: message.publicStatus ?? null,
    expiresAt: message.expiresAt?.toISOString() ?? null,
    approvedAt: message.approvedAt?.toISOString() ?? null,
    approvedByName: message.approvedByName ?? null,
    rejectedAt: message.rejectedAt?.toISOString() ?? null,
    rejectedByName: message.rejectedByName ?? null,
    rejectionReason: message.rejectionReason ?? null,
    acknowledgementCount,
    acknowledgedByCurrentUser,
  };
}

function radioResponse(log: typeof radioTrafficLogsTable.$inferSelect) {
  return {
    ...log,
    parishId: log.parishId ?? null,
    occurredAt: log.occurredAt.toISOString(),
    createdAt: log.createdAt.toISOString(),
  };
}

async function actorFor(req: Request): Promise<Actor | null> {
  const { userId } = getAuth(req);
  if (!userId) return null;
  const user = await clerkClient.users.getUser(userId);
  const authority = resolveOperatorAuthority(
    user.privateMetadata,
    (parishId) => PARISHES.some((parish) => parish.id === parishId),
  );
  if (!authority || !COMMUNICATION_ROLES.has(authority.role)) return null;
  const metadata = user.publicMetadata as Record<string, unknown>;
  const name = typeof metadata.rvpFullName === "string" && metadata.rvpFullName.trim()
    ? metadata.rvpFullName.trim().slice(0, 160)
    : [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "Authenticated operator";
  return { userId, name, authority };
}

function allowedScope(authority: OperatorAuthority, countryCode: string, parishId?: string): boolean {
  if (authority.role !== "system_admin") {
    if (!authority.countryCode || authority.countryCode !== countryCode) return false;
    if (authority.parishId && authority.parishId !== parishId) return false;
  }
  if (parishId && countryCode === "JAM" && !PARISHES.some((parish) => parish.id === parishId)) return false;
  return true;
}

function isVisibleTo(actor: Actor, message: typeof communicationsMessagesTable.$inferSelect): boolean {
  return allowedScope(actor.authority, message.countryCode, message.parishId ?? undefined)
    && canViewAudience(actor.authority, message.audience as CommunicationAudience);
}

function startEventStream(req: Request, res: import("express").Response, subscribe: (event: { countryCode: string; parishId: string | null; audience: CommunicationAudience; publicStatus: string | null; expiresAt: Date | null }) => boolean): void {
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("event: ready\ndata: {}\n\n");
  const unsubscribe = subscribeToCommunicationEvents((event) => {
    if (!subscribe(event)) return false;
    res.write("event: refresh\ndata: {}\n\n");
    return true;
  });
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25_000);
  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
}

function scopePredicate(authority: OperatorAuthority) {
  if (authority.role === "system_admin") return undefined;
  if (!authority.countryCode) return null;
  return authority.parishId
    ? and(eq(communicationsMessagesTable.countryCode, authority.countryCode), eq(communicationsMessagesTable.parishId, authority.parishId))
    : eq(communicationsMessagesTable.countryCode, authority.countryCode);
}

function radioScopePredicate(authority: OperatorAuthority) {
  if (authority.role === "system_admin") return undefined;
  if (!authority.countryCode) return null;
  return authority.parishId
    ? and(eq(radioTrafficLogsTable.countryCode, authority.countryCode), eq(radioTrafficLogsTable.parishId, authority.parishId))
    : eq(radioTrafficLogsTable.countryCode, authority.countryCode);
}

router.get("/communications", async (req, res): Promise<void> => {
  const actor = await actorFor(req);
  if (!actor) {
    res.status(403).json({ error: "Operational communications authority is required" });
    return;
  }
  const query = ListCommunicationsQueryParams.safeParse(req.query);
  if (!query.success) {
    req.log.warn({ errors: query.error.flatten() }, "Invalid communications query");
    res.status(400).json({ error: "Invalid communications query" });
    return;
  }
  const scope = scopePredicate(actor.authority);
  if (scope === null) {
    res.status(403).json({ error: "Your account has no assigned communications scope" });
    return;
  }
  const conditions = [scope, query.data.priority ? eq(communicationsMessagesTable.priority, query.data.priority) : undefined, query.data.channel ? eq(communicationsMessagesTable.channel, query.data.channel) : undefined, query.data.audience ? eq(communicationsMessagesTable.audience, query.data.audience) : undefined].filter(Boolean);
  const messages = await db.select().from(communicationsMessagesTable)
    .where(conditions.length ? and(...conditions) : undefined).orderBy(desc(communicationsMessagesTable.createdAt));
  const visibleMessages = messages.filter((message) => isVisibleTo(actor, message));
  const ids = visibleMessages.map((message) => message.id);
  const acknowledgements = ids.length
    ? await db.select().from(communicationsAcknowledgementsTable).where(inArray(communicationsAcknowledgementsTable.messageId, ids))
    : [];
  const byMessage = new Map<string, typeof acknowledgements>();
  acknowledgements.forEach((acknowledgement) => byMessage.set(acknowledgement.messageId, [...(byMessage.get(acknowledgement.messageId) ?? []), acknowledgement]));
  res.json(ListCommunicationsResponse.parse(visibleMessages.map((message) => {
    const acks = byMessage.get(message.id) ?? [];
    return communicationResponse(message, acks.length, acks.some((ack) => ack.userId === actor.userId));
  })));
});

router.get("/communications/events", async (req, res): Promise<void> => {
  const actor = await actorFor(req);
  if (!actor) {
    res.status(403).json({ error: "Operational communications authority is required" });
    return;
  }
  startEventStream(req, res, (event) => allowedScope(actor.authority, event.countryCode, event.parishId ?? undefined)
    && canViewAudience(actor.authority, event.audience));
});

router.post("/communications", async (req, res): Promise<void> => {
  const actor = await actorFor(req);
  if (!actor) {
    res.status(403).json({ error: "Operational communications authority is required" });
    return;
  }
  const parsed = CreateCommunicationBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.flatten() }, "Invalid communication input");
    res.status(400).json({ error: "Invalid communication input" });
    return;
  }
  const data = parsed.data;
  const countryCode = data.countryCode.toUpperCase();
  if (!allowedScope(actor.authority, countryCode, data.parishId)) {
    res.status(403).json({ error: "Communication scope is not authorized" });
    return;
  }
  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined;
  if (data.audience === "public" && (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) {
    res.status(400).json({ error: "Public alerts require a future expiry time" });
    return;
  }
  if (data.audience !== "public" && data.expiresAt) {
    res.status(400).json({ error: "Only public alerts may have an expiry time" });
    return;
  }
  await db.insert(communicationsMessagesTable).values({
    id: crypto.randomUUID(), clientId: data.clientId, body: data.body.trim(), priority: data.priority, channel: data.channel,
    deliveryState: data.channel === "sms" ? "requested" : "recorded", audience: data.audience, countryCode, parishId: data.parishId ?? null,
    senderUserId: actor.userId, senderName: actor.name,
    publicStatus: data.audience === "public" ? "pending_approval" : null,
    expiresAt: expiresAt ?? null,
  }).onConflictDoNothing({ target: [communicationsMessagesTable.senderUserId, communicationsMessagesTable.clientId] });
  const [message] = await db.select().from(communicationsMessagesTable)
    .where(and(eq(communicationsMessagesTable.clientId, data.clientId), eq(communicationsMessagesTable.senderUserId, actor.userId)));
  if (!message) throw new Error("Communication idempotency record was not found");
  req.log.info({ messageId: message.id, channel: message.channel }, "Operational communication recorded");
  publishCommunicationRefresh({ countryCode: message.countryCode, parishId: message.parishId, audience: message.audience as CommunicationAudience, publicStatus: message.publicStatus, expiresAt: message.expiresAt });
  res.status(201).json(CreateCommunicationResponse.parse(communicationResponse(message, 0, false)));
});

router.post("/communications/:id/acknowledgements", async (req, res): Promise<void> => {
  const actor = await actorFor(req);
  if (!actor) {
    res.status(403).json({ error: "Operational communications authority is required" });
    return;
  }
  const params = AcknowledgeCommunicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid communication id" });
    return;
  }
  const [message] = await db.select().from(communicationsMessagesTable).where(eq(communicationsMessagesTable.id, params.data.id));
  if (!message) {
    res.status(404).json({ error: "Communication not found" });
    return;
  }
  if (!isVisibleTo(actor, message)) {
    res.status(403).json({ error: "Communication scope is not authorized" });
    return;
  }
  await db.insert(communicationsAcknowledgementsTable).values({ id: crypto.randomUUID(), messageId: message.id, userId: actor.userId })
    .onConflictDoNothing({ target: [communicationsAcknowledgementsTable.messageId, communicationsAcknowledgementsTable.userId] });
  const [acknowledgement] = await db.select().from(communicationsAcknowledgementsTable)
    .where(and(eq(communicationsAcknowledgementsTable.messageId, message.id), eq(communicationsAcknowledgementsTable.userId, actor.userId)));
  if (!acknowledgement) throw new Error("Acknowledgement idempotency record was not found");
  res.json(AcknowledgeCommunicationResponse.parse({ ...acknowledgement, acknowledgedAt: acknowledgement.acknowledgedAt.toISOString() }));
});

router.get("/communications/public-alerts/pending", async (req, res): Promise<void> => {
  const actor = await actorFor(req);
  if (!actor || !canReviewPublicAlert(actor.authority)) {
    res.status(403).json({ error: "Public alert approval authority is required" });
    return;
  }
  const scope = scopePredicate(actor.authority);
  if (scope === null) {
    res.status(403).json({ error: "Your account has no assigned communications scope" });
    return;
  }
  const alerts = await db.select().from(communicationsMessagesTable).where(and(
    scope,
    eq(communicationsMessagesTable.audience, "public"),
    eq(communicationsMessagesTable.publicStatus, "pending_approval"),
  )).orderBy(desc(communicationsMessagesTable.createdAt));
  res.json(ListPendingPublicAlertsResponse.parse(alerts.map((alert) => communicationResponse(alert, 0, false))));
});

router.post("/communications/:id/public-alert-review", async (req, res): Promise<void> => {
  const actor = await actorFor(req);
  if (!actor || !canReviewPublicAlert(actor.authority)) {
    res.status(403).json({ error: "Public alert approval authority is required" });
    return;
  }
  const params = ReviewPublicAlertParams.safeParse(req.params);
  const review = ReviewPublicAlertBody.safeParse(req.body);
  if (!params.success || !review.success || (review.data.action === "reject" && !review.data.rejectionReason?.trim())) {
    res.status(400).json({ error: "A valid public alert review is required" });
    return;
  }
  const [alert] = await db.select().from(communicationsMessagesTable).where(eq(communicationsMessagesTable.id, params.data.id));
  if (!alert || alert.audience !== "public") {
    res.status(404).json({ error: "Public alert not found" });
    return;
  }
  if (!allowedScope(actor.authority, alert.countryCode, alert.parishId ?? undefined)) {
    res.status(403).json({ error: "Public alert scope is not authorized" });
    return;
  }
  if (alert.publicStatus !== "pending_approval") {
    res.status(400).json({ error: "Only pending public alerts can be reviewed" });
    return;
  }
  const approved = review.data.action === "approve";
  const [updated] = await db.update(communicationsMessagesTable).set(approved
    ? { publicStatus: "published", approvedAt: new Date(), approvedByUserId: actor.userId, approvedByName: actor.name }
    : { publicStatus: "rejected", rejectedAt: new Date(), rejectedByUserId: actor.userId, rejectedByName: actor.name, rejectionReason: review.data.rejectionReason!.trim() },
  ).where(eq(communicationsMessagesTable.id, alert.id)).returning();
  req.log.info({ messageId: alert.id, action: review.data.action }, "Public alert reviewed");
  publishCommunicationRefresh({ countryCode: updated.countryCode, parishId: updated.parishId, audience: "public", publicStatus: updated.publicStatus, expiresAt: updated.expiresAt });
  res.json(ReviewPublicAlertResponse.parse(communicationResponse(updated, 0, false)));
});

router.get("/communications/public-alerts", async (req, res): Promise<void> => {
  const query = ListPublicAlertsQueryParams.safeParse(req.query);
  if (!query.success || !query.data.countryCode.trim() || (query.data.parishId && (query.data.countryCode.toUpperCase() !== "JAM" || !PARISHES.some((parish) => parish.id === query.data.parishId)))) {
    res.status(400).json({ error: "A valid country and optional Jamaica parish are required" });
    return;
  }
  const countryCode = query.data.countryCode.toUpperCase();
  const now = new Date();
  await db.update(communicationsMessagesTable).set({ publicStatus: "expired" }).where(and(
    eq(communicationsMessagesTable.audience, "public"),
    eq(communicationsMessagesTable.publicStatus, "published"),
    lt(communicationsMessagesTable.expiresAt, now),
  ));
  const filters = [
    eq(communicationsMessagesTable.audience, "public"),
    eq(communicationsMessagesTable.publicStatus, "published"),
    eq(communicationsMessagesTable.countryCode, countryCode),
    gt(communicationsMessagesTable.expiresAt, now),
    query.data.parishId ? eq(communicationsMessagesTable.parishId, query.data.parishId) : undefined,
  ].filter(Boolean);
  const alerts = await db.select().from(communicationsMessagesTable).where(and(...filters)).orderBy(desc(communicationsMessagesTable.createdAt));
  res.json(ListPublicAlertsResponse.parse(alerts.map((alert) => ({
    id: alert.id, body: alert.body, priority: alert.priority, channel: alert.channel, countryCode: alert.countryCode,
    parishId: alert.parishId ?? null, issuedAt: alert.approvedAt?.toISOString() ?? alert.createdAt.toISOString(), expiresAt: alert.expiresAt!.toISOString(),
  }))));
});

router.get("/communications/public-alerts/events", async (req, res): Promise<void> => {
  const query = ListPublicAlertsQueryParams.safeParse(req.query);
  if (!query.success || !query.data.countryCode.trim() || (query.data.parishId && (query.data.countryCode.toUpperCase() !== "JAM" || !PARISHES.some((parish) => parish.id === query.data.parishId)))) {
    res.status(400).json({ error: "A valid country and optional Jamaica parish are required" });
    return;
  }
  const countryCode = query.data.countryCode.toUpperCase();
  const parishId = query.data.parishId;
  startEventStream(req, res, (event) => event.audience === "public"
    && event.publicStatus === "published"
    && !!event.expiresAt && event.expiresAt > new Date()
    && event.countryCode === countryCode
    && (!parishId ? true : event.parishId === parishId));
});

router.get("/radio-traffic", async (req, res): Promise<void> => {
  const actor = await actorFor(req);
  if (!actor) {
    res.status(403).json({ error: "Operational communications authority is required" });
    return;
  }
  const query = ListRadioTrafficQueryParams.safeParse(req.query);
  const scope = radioScopePredicate(actor.authority);
  if (!query.success || scope === null) {
    res.status(400).json({ error: "Invalid radio traffic query or unassigned scope" });
    return;
  }
  const conditions = [scope, query.data.priority ? eq(radioTrafficLogsTable.priority, query.data.priority) : undefined].filter(Boolean);
  const logs = await db.select().from(radioTrafficLogsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(radioTrafficLogsTable.occurredAt));
  res.json(ListRadioTrafficResponse.parse(logs.map(radioResponse)));
});

router.post("/radio-traffic", async (req, res): Promise<void> => {
  const actor = await actorFor(req);
  const parsed = CreateRadioTrafficBody.safeParse(req.body);
  if (!actor) {
    res.status(403).json({ error: "Operational communications authority is required" });
    return;
  }
  if (!parsed.success || Number.isNaN(new Date(parsed.success ? parsed.data.occurredAt : "").getTime())) {
    res.status(400).json({ error: "Invalid radio traffic input" });
    return;
  }
  const data = parsed.data;
  const countryCode = data.countryCode.toUpperCase();
  if (!allowedScope(actor.authority, countryCode, data.parishId)) {
    res.status(403).json({ error: "Radio traffic scope is not authorized" });
    return;
  }
  await db.insert(radioTrafficLogsTable).values({
    id: crypto.randomUUID(), clientId: data.clientId, station: data.station.trim(), direction: data.direction, body: data.body.trim(),
    occurredAt: new Date(data.occurredAt), priority: data.priority, countryCode, parishId: data.parishId ?? null,
    recorderUserId: actor.userId, recorderName: actor.name,
  }).onConflictDoNothing({ target: [radioTrafficLogsTable.recorderUserId, radioTrafficLogsTable.clientId] });
  const [log] = await db.select().from(radioTrafficLogsTable)
    .where(and(eq(radioTrafficLogsTable.clientId, data.clientId), eq(radioTrafficLogsTable.recorderUserId, actor.userId)));
  if (!log) throw new Error("Radio idempotency record was not found");
  req.log.info({ radioLogId: log.id, station: log.station }, "Radio traffic recorded");
  res.status(201).json(CreateRadioTrafficResponse.parse(radioResponse(log)));
});

export default router;