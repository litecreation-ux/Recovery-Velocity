import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { and, eq, gt, max, sql } from "drizzle-orm";
import app from "../app.ts";
import { auditLogTable, db, unifiedCommandWorkspacesTable } from "@workspace/db";
import { AidExpirationNotificationDispatchError } from "./aid-expiration-notification-dispatcher.ts";
import {
  resetAidExpirationNotificationDispatcherForTests,
  setAidExpirationNotificationDispatcherForTests,
} from "../routes/unified-command.ts";

const workspaceId = "jamaica-national-response";

async function request(baseUrl, init = {}) {
  const response = await fetch(`${baseUrl}/api/unified-command/${workspaceId}`, init);
  const body = await response.json();
  return { response, body };
}

test("Unified Command persists audited, scoped actions with explicitly enabled test authority", async () => {
  process.env.NODE_ENV = "test";
  process.env.ALLOW_RVP_DEMO_AUTH = "true";
  process.env.INCIDENT_COMMAND_ALERT_EMAIL = "incident-command@example.org";
  process.env.SENDGRID_FROM_EMAIL = "alerts@example.org";
  const dispatchCalls = [];
  let dispatchFailureMode = null;
  setAidExpirationNotificationDispatcherForTests(async (channel, payload) => {
    dispatchCalls.push({ channel, payload });
    if (dispatchFailureMode === "failed") {
      throw new AidExpirationNotificationDispatchError("Provider unavailable", "failed");
    }
    if (dispatchFailureMode === "unknown") throw new Error("Connection closed before acknowledgement");
    return { providerMessageId: `provider-${dispatchCalls.length}` };
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  let originalRow;
  let originalMaxAuditId = 0;
  try {
    const initial = await request(baseUrl, {
      headers: { "X-RVP-Demo-Role": "national_coordinator" },
    });
    assert.equal(initial.response.status, 200);
    assert.equal(initial.body.parishId, "st-elizabeth");
    [originalRow] = await db.select().from(unifiedCommandWorkspacesTable)
      .where(eq(unifiedCommandWorkspacesTable.id, workspaceId));
    const [auditMax] = await db.select({ value: max(auditLogTable.id) }).from(auditLogTable);
    originalMaxAuditId = auditMax.value ?? 0;

    const fieldRead = await request(baseUrl, {
      headers: { "X-RVP-Demo-Role": "field_officer" },
    });
    assert.equal(fieldRead.response.status, 200);
    assert.deepEqual(fieldRead.body.capabilities, ["view"]);

    const fieldWrite = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "field_officer" },
      body: JSON.stringify({ type: "post_message", message: "must be denied" }),
    });
    assert.equal(fieldWrite.response.status, 403);

    const invalid = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "national_coordinator" },
      body: JSON.stringify({ type: "create_objective", title: "Invalid", description: "Invalid", priority: "impossible" }),
    });
    assert.equal(invalid.response.status, 400);

    const marker = `integration-${Date.now()}`;
    const write = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "parish_manager" },
      body: JSON.stringify({ type: "post_message", message: marker, channel: "Integration test" }),
    });
    assert.equal(write.response.status, 200);
    assert.equal(write.body.communications.at(-1).message, marker);

    const [persisted] = await db.select().from(unifiedCommandWorkspacesTable)
      .where(eq(unifiedCommandWorkspacesTable.id, workspaceId));
    assert.ok(persisted.communications.some((item) => item.message === marker));
    const audits = await db.select().from(auditLogTable)
      .where(gt(auditLogTable.id, originalMaxAuditId));
    assert.ok(audits.some((entry) => entry.action === "Unified Command: post_message"));

    const unauthorizedNotificationConfiguration = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "parish_manager" },
      body: JSON.stringify({
        type: "configure_aid_expiration_notifications",
        notificationChannelId: "incident-command-email",
      }),
    });
    assert.equal(unauthorizedNotificationConfiguration.response.status, 403);

    const unknownNotificationConfiguration = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "national_coordinator" },
      body: JSON.stringify({
        type: "configure_aid_expiration_notifications",
        notificationChannelId: "unapproved-personal-number",
      }),
    });
    assert.equal(unknownNotificationConfiguration.response.status, 400);

    const notificationConfiguration = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "national_coordinator" },
      body: JSON.stringify({
        type: "configure_aid_expiration_notifications",
        notificationChannelId: "incident-command-email",
      }),
    });
    assert.equal(notificationConfiguration.response.status, 200);
    assert.equal(notificationConfiguration.body.aidExpirationNotificationChannelId, "incident-command-email");

    const aiAidId = `ai-aid-integration-${Date.now()}`;
    const [workspaceForAid] = await db.select().from(unifiedCommandWorkspacesTable)
      .where(eq(unifiedCommandWorkspacesTable.id, workspaceId));
    await db.update(unifiedCommandWorkspacesTable).set({
      mutualAid: [
        ...workspaceForAid.mutualAid,
        {
          id: aiAidId,
          requester: "St. Elizabeth Incident Command",
          provider: "No confirmed provider",
          planningCandidates: [{ code: "BRB", name: "Barbados", reason: "Planning proximity", planningOnly: true }],
          resource: "Emergency medical kits",
          quantity: 10,
          requestedQuantity: 10,
          unit: "kits",
          destination: "Black River staging area",
          status: "requested",
          approval: "pending",
          eta: null,
          resourceDeclarationId: null,
          createdAt: new Date().toISOString(),
        },
      ],
      revision: sql`${unifiedCommandWorkspacesTable.revision} + 1`,
    }).where(eq(unifiedCommandWorkspacesTable.id, workspaceId));

    const invalidConfirmation = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "national_coordinator" },
      body: JSON.stringify({
        type: "confirm_aid",
        recordId: aiAidId,
        confirmationSource: "CDEMA coordination call",
        confirmationTimestamp: new Date(Date.now() - 60_000).toISOString(),
        confirmationProvider: "Barbados Department of Emergency Management",
        acceptedQuantity: 4,
        status: "committed",
      }),
    });
    assert.equal(invalidConfirmation.response.status, 400);

    const unauthorizedConfirmation = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "parish_manager" },
      body: JSON.stringify({
        type: "confirm_aid",
        recordId: aiAidId,
        confirmationReference: "UNAUTHORIZED",
        confirmationSource: "Unverified call",
        confirmationTimestamp: new Date(Date.now() - 60_000).toISOString(),
        confirmationProvider: "Unverified provider",
        acceptedQuantity: 10,
        status: "committed",
      }),
    });
    assert.equal(unauthorizedConfirmation.response.status, 403);

    const confirmationReference = `CDEMA-${Date.now()}`;
    const validConfirmation = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "national_coordinator" },
      body: JSON.stringify({
        type: "confirm_aid",
        recordId: aiAidId,
        confirmationReference,
        confirmationSource: "CDEMA coordination call",
        confirmationTimestamp: new Date(Date.now() - 60_000).toISOString(),
        confirmationProvider: "Barbados Department of Emergency Management",
        acceptedQuantity: 4,
        confirmationExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        status: "committed",
      }),
    });
    assert.equal(validConfirmation.response.status, 200);
    const confirmedAid = validConfirmation.body.mutualAid.find((aid) => aid.id === aiAidId);
    assert.equal(confirmedAid.approval, "approved");
    assert.equal(confirmedAid.status, "committed");
    assert.equal(confirmedAid.confirmation.status, "partial");
    assert.equal(confirmedAid.confirmation.reference, confirmationReference);
    assert.equal(confirmedAid.quantity, 4);
    assert.equal(confirmedAid.requestedQuantity, 10);
    assert.equal(confirmedAid.confirmationHistory.length, 1);
    assert.equal(confirmedAid.planningCandidates[0].name, "Barbados");
    const warning = validConfirmation.body.expirationWarnings.find((item) => item.aidId === aiAidId);
    assert.equal(warning.provider, "Barbados Department of Emergency Management");
    assert.equal(warning.reference, confirmationReference);
    assert.ok(warning.remainingMs > 0);
    assert.ok(warning.remainingMs <= 24 * 60 * 60 * 1000);
    const delivery = validConfirmation.body.notificationDeliveries.find((item) => item.warningKey === warning.warningKey);
    assert.equal(delivery.status, "delivered");
    assert.equal(delivery.destinationId, "incident-command-email");
    assert.equal(delivery.providerMessageId, "provider-1");
    assert.equal(dispatchCalls.length, 1);
    assert.equal(dispatchCalls[0].channel.recipient, "incident-command@example.org");
    assert.equal(JSON.stringify(dispatchCalls[0].payload).includes(confirmationReference), false);
    assert.equal(JSON.stringify(dispatchCalls[0].payload).includes("CDEMA coordination call"), false);
    assert.equal("reference" in delivery, false);
    assert.equal("source" in delivery, false);
    const channelNotification = validConfirmation.body.communications.find((item) =>
      item.channel === "Incident Command email" && item.message.includes("Aid confirmation nearing expiration"));
    assert.ok(channelNotification);
    assert.equal(channelNotification.message.includes(confirmationReference), false);
    assert.equal(channelNotification.message.includes("CDEMA coordination call"), false);
    const fieldDeliveryRead = await request(baseUrl, {
      headers: { "X-RVP-Demo-Role": "field_officer" },
    });
    assert.deepEqual(fieldDeliveryRead.body.notificationChannels, []);
    assert.deepEqual(fieldDeliveryRead.body.notificationDeliveries, []);
    assert.equal(fieldDeliveryRead.body.aidExpirationNotificationChannelId, null);
    assert.equal(fieldDeliveryRead.body.communications.some((item) =>
      item.channel === "Incident Command email" && item.message.includes("Aid confirmation nearing expiration")), false);
    const warningEventsBeforeRepeat = validConfirmation.body.accessEvents
      .filter((event) => event.action === "aid_confirmation_expiration_warning" && event.subject === "Emergency medical kits")
      .length;
    assert.equal(warningEventsBeforeRepeat, 1);
    const repeatedWarningRead = await request(baseUrl, {
      headers: { "X-RVP-Demo-Role": "national_coordinator" },
    });
    assert.equal(
      repeatedWarningRead.body.accessEvents
        .filter((event) => event.action === "aid_confirmation_expiration_warning" && event.subject === "Emergency medical kits")
        .length,
      warningEventsBeforeRepeat,
    );
    assert.equal(
      repeatedWarningRead.body.notificationDeliveries
        .filter((item) => item.warningKey === warning.warningKey)
        .length,
      1,
    );
    assert.equal(dispatchCalls.length, 1);
    assert.equal(
      repeatedWarningRead.body.communications
        .filter((item) => item.channel === "Incident Command email" && item.message.includes("Aid confirmation nearing expiration"))
        .length,
      1,
    );

    const updatedReference = `${confirmationReference}-REV2`;
    const updatedConfirmation = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "national_coordinator" },
      body: JSON.stringify({
        type: "confirm_aid",
        recordId: aiAidId,
        confirmationReference: updatedReference,
        confirmationSource: "Official counterpart email",
        confirmationTimestamp: new Date(Date.now() - 30_000).toISOString(),
        confirmationProvider: "Barbados Department of Emergency Management",
        acceptedQuantity: 6,
        confirmationExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        status: "committed",
      }),
    });
    assert.equal(updatedConfirmation.response.status, 200);
    const revisedAid = updatedConfirmation.body.mutualAid.find((aid) => aid.id === aiAidId);
    assert.equal(revisedAid.quantity, 6);
    assert.equal(revisedAid.confirmationHistory.length, 2);
    assert.equal(
      updatedConfirmation.body.expirationWarnings.find((item) => item.aidId === aiAidId).reference,
      updatedReference,
    );
    assert.equal(
      updatedConfirmation.body.accessEvents
        .filter((event) => event.action === "aid_confirmation_expiration_warning" && event.subject === "Emergency medical kits")
        .length,
      2,
    );

    dispatchFailureMode = "failed";
    const failedReference = `${confirmationReference}-REV3`;
    const failedConfirmationDelivery = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "national_coordinator" },
      body: JSON.stringify({
        type: "confirm_aid",
        recordId: aiAidId,
        confirmationReference: failedReference,
        confirmationSource: "Restricted counterpart message",
        confirmationTimestamp: new Date(Date.now() - 15_000).toISOString(),
        confirmationProvider: "Barbados Department of Emergency Management",
        acceptedQuantity: 6,
        confirmationExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        status: "committed",
      }),
    });
    assert.equal(failedConfirmationDelivery.response.status, 200);
    const failedWarning = failedConfirmationDelivery.body.expirationWarnings
      .find((item) => item.aidId === aiAidId);
    const failedDelivery = failedConfirmationDelivery.body.notificationDeliveries
      .find((item) => item.warningKey === failedWarning.warningKey);
    assert.equal(failedDelivery.status, "failed");
    assert.equal(failedDelivery.error, "Provider unavailable");
    assert.equal(failedDelivery.attempts, 1);
    assert.equal(dispatchCalls.length, 3);
    dispatchFailureMode = "unknown";
    const ambiguousReference = `${confirmationReference}-REV4`;
    const ambiguousConfirmationDelivery = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "national_coordinator" },
      body: JSON.stringify({
        type: "confirm_aid",
        recordId: aiAidId,
        confirmationReference: ambiguousReference,
        confirmationSource: "Restricted ambiguous acknowledgement",
        confirmationTimestamp: new Date(Date.now() - 15_000).toISOString(),
        confirmationProvider: "Barbados Department of Emergency Management",
        acceptedQuantity: 6,
        confirmationExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        status: "committed",
      }),
    });
    assert.equal(ambiguousConfirmationDelivery.response.status, 200);
    const ambiguousWarning = ambiguousConfirmationDelivery.body.expirationWarnings
      .find((item) => item.aidId === aiAidId);
    const ambiguousDelivery = ambiguousConfirmationDelivery.body.notificationDeliveries
      .find((item) => item.warningKey === ambiguousWarning.warningKey);
    assert.equal(ambiguousDelivery.status, "unknown");
    assert.ok(ambiguousDelivery.error.includes("Connection closed"));
    assert.equal(dispatchCalls.length, 4);
    dispatchFailureMode = null;

    await request(baseUrl, {
      headers: { "X-RVP-Demo-Role": "national_coordinator" },
    });
    assert.equal(dispatchCalls.length, 4);

    const [staleClaimRow] = await db.select().from(unifiedCommandWorkspacesTable)
      .where(eq(unifiedCommandWorkspacesTable.id, workspaceId));
    await db.update(unifiedCommandWorkspacesTable)
      .set({
        notificationDeliveries: staleClaimRow.notificationDeliveries.map((item) =>
          item.warningKey === ambiguousWarning.warningKey
            ? { ...item, status: "pending", attemptedAt: new Date(Date.now() - 6 * 60_000).toISOString() }
            : item),
      })
      .where(eq(unifiedCommandWorkspacesTable.id, workspaceId));
    const recoveredClaim = await request(baseUrl, {
      headers: { "X-RVP-Demo-Role": "national_coordinator" },
    });
    const recoveredDelivery = recoveredClaim.body.notificationDeliveries
      .find((item) => item.warningKey === ambiguousWarning.warningKey);
    assert.equal(recoveredDelivery.status, "unknown");
    assert.equal(dispatchCalls.length, 4);

    const dispatchConfirmedAid = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "parish_manager" },
      body: JSON.stringify({
        type: "update_aid",
        recordId: aiAidId,
        status: "en_route",
        approval: "approved",
      }),
    });
    assert.equal(dispatchConfirmedAid.response.status, 200);
    assert.equal(dispatchConfirmedAid.body.mutualAid.find((aid) => aid.id === aiAidId).status, "en_route");

    const [workspaceBeforeExpiry] = await db.select().from(unifiedCommandWorkspacesTable)
      .where(eq(unifiedCommandWorkspacesTable.id, workspaceId));
    await db.update(unifiedCommandWorkspacesTable).set({
      mutualAid: workspaceBeforeExpiry.mutualAid.map((aid) => aid.id === aiAidId
        ? { ...aid, confirmation: { ...aid.confirmation, expiresAt: new Date(Date.now() - 1_000).toISOString() } }
        : aid),
      revision: sql`${unifiedCommandWorkspacesTable.revision} + 1`,
    }).where(eq(unifiedCommandWorkspacesTable.id, workspaceId));
    const expiredRead = await request(baseUrl, {
      headers: { "X-RVP-Demo-Role": "national_coordinator" },
    });
    const expiredAid = expiredRead.body.mutualAid.find((aid) => aid.id === aiAidId);
    assert.equal(expiredAid.status, "cancelled");
    assert.equal(expiredAid.approval, "declined");
    assert.equal(expiredAid.confirmation.status, "expired");
    const expirationEventsBeforeRepeat = expiredRead.body.accessEvents.filter((event) => event.action === "aid_confirmation_expired" && event.subject === "Emergency medical kits").length;
    await request(baseUrl, { headers: { "X-RVP-Demo-Role": "national_coordinator" } });
    const afterRepeatedRead = await request(baseUrl, { headers: { "X-RVP-Demo-Role": "national_coordinator" } });
    assert.equal(
      afterRepeatedRead.body.accessEvents.filter((event) => event.action === "aid_confirmation_expired" && event.subject === "Emergency medical kits").length,
      expirationEventsBeforeRepeat,
    );

    const confirmationAudits = await db.select().from(auditLogTable)
      .where(gt(auditLogTable.id, originalMaxAuditId));
    assert.ok(confirmationAudits.some((entry) => entry.action === "Unified Command: aid_confirmation_recorded"));
    assert.ok(confirmationAudits.some((entry) => entry.action === "Unified Command: aid_confirmation_updated"));
    assert.ok(confirmationAudits.some((entry) => entry.action === "Unified Command: aid_confirmation_expired"));
    const deliveryAudits = confirmationAudits.filter((entry) =>
      entry.action === "Unified Command: aid_expiration_warning_delivery_succeeded");
    assert.equal(deliveryAudits.length, 2);
    assert.ok(deliveryAudits.every((entry) => !entry.details.includes(confirmationReference)));
    assert.ok(deliveryAudits.every((entry) => !entry.details.includes("CDEMA coordination call")));
    const failedDeliveryAudits = confirmationAudits.filter((entry) =>
      entry.action === "Unified Command: aid_expiration_warning_delivery_failed");
    assert.equal(failedDeliveryAudits.length, 1);
    assert.ok(failedDeliveryAudits.every((entry) => !entry.details.includes(failedReference)));
    assert.ok(failedDeliveryAudits.every((entry) => !entry.details.includes("Restricted counterpart message")));
    const unknownDeliveryAudits = confirmationAudits.filter((entry) =>
      entry.action === "Unified Command: aid_expiration_warning_delivery_unknown");
    assert.equal(unknownDeliveryAudits.length, 2);
    assert.ok(unknownDeliveryAudits.every((entry) => !entry.details.includes(ambiguousReference)));
    assert.ok(unknownDeliveryAudits.every((entry) => !entry.details.includes("Restricted ambiguous acknowledgement")));
    assert.ok(confirmationAudits.some((entry) => entry.details.includes(confirmationReference)));
    assert.ok(confirmationAudits.some((entry) => entry.details.includes(updatedReference) && entry.details.includes(confirmationReference)));

    const inviteMarker = `Invite ${Date.now()}`;
    const invite = await request(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RVP-Demo-Role": "national_coordinator" },
      body: JSON.stringify({
        type: "invite_member",
        email: `invite-${Date.now()}@example.org`,
        name: inviteMarker,
        role: "field_officer",
        roleTitle: "Field Officer",
        agency: "Jamaica Constabulary Force",
        icsFunction: "Operations",
        contactChannel: "Radio",
        scope: "St. Elizabeth",
      }),
    });
    assert.equal(invite.response.status, 200);
    const invitedMember = invite.body.members.find((member) => member.name === inviteMarker);
    assert.equal(invitedMember.accessRole, "field_officer");
    assert.equal(invitedMember.role, "Field Officer");
    assert.equal(invitedMember.agency, "Jamaica Constabulary Force");
    assert.equal(invitedMember.icsFunction, "Operations");
    assert.equal(invitedMember.contactChannel, "Radio");
    assert.equal(invitedMember.scope, "St. Elizabeth");
    assert.equal("email" in invitedMember, false);

    const [afterInvite] = await db.select({ revision: unifiedCommandWorkspacesTable.revision })
      .from(unifiedCommandWorkspacesTable)
      .where(eq(unifiedCommandWorkspacesTable.id, workspaceId));
    const expectedRevision = afterInvite.revision;
    const update = () => db.update(unifiedCommandWorkspacesTable)
      .set({ revision: sql`${unifiedCommandWorkspacesTable.revision} + 1` })
      .where(and(
        eq(unifiedCommandWorkspacesTable.id, workspaceId),
        eq(unifiedCommandWorkspacesTable.revision, expectedRevision),
      ))
      .returning({ revision: unifiedCommandWorkspacesTable.revision });
    const [left, right] = await Promise.all([update(), update()]);
    assert.deepEqual([left.length, right.length].sort(), [0, 1]);

    process.env.NODE_ENV = "production";
    const productionDemo = await request(baseUrl, {
      headers: { "X-RVP-Demo-Role": "national_coordinator" },
    });
    assert.equal(productionDemo.response.status, 401);
  } finally {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_RVP_DEMO_AUTH;
    if (originalRow) {
      await db.update(unifiedCommandWorkspacesTable).set(originalRow)
        .where(eq(unifiedCommandWorkspacesTable.id, workspaceId));
      await db.delete(auditLogTable).where(gt(auditLogTable.id, originalMaxAuditId));
    }
    server.close();
    await once(server, "close");
    resetAidExpirationNotificationDispatcherForTests();
  }
});