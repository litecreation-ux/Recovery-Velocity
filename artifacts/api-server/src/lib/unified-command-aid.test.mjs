import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAidExpirationNotification,
  formatAidExpirationWindow,
  getAidConfirmationExpirationWarning,
  isSafeAiAidTransition,
  isValidAidConfirmation,
  validateAidConfirmationInput,
} from "./unified-command-aid.ts";

test("AI planning aid cannot become approved or committed without counterpart confirmation", () => {
  const planningAid = { id: "ai-aid-draft", status: "requested", approval: "pending" };
  assert.equal(isSafeAiAidTransition(planningAid, { status: "committed" }), false);
  assert.equal(isSafeAiAidTransition(planningAid, { approval: "approved" }), false);
  assert.equal(isSafeAiAidTransition(planningAid, { status: "cancelled", approval: "declined" }), true);
  assert.equal(isSafeAiAidTransition({ id: "a-manual", status: "requested", approval: "pending" }, { status: "committed" }), true);
});

test("validated counterpart acceptance unlocks only approved AI aid transitions", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");
  const result = validateAidConfirmationInput({
    reference: "CDEMA-OPS-204",
    source: "CDEMA coordination call",
    confirmedAt: "2026-08-31T11:45:00.000Z",
    provider: "Barbados Department of Emergency Management",
    acceptedQuantity: 6,
    expiresAt: "2026-09-01T12:00:00.000Z",
  }, 10, "Incident Commander", now);

  assert.equal(result.error, null);
  assert.equal(result.confirmation?.status, "partial");
  const aid = {
    id: "ai-aid-draft",
    status: "requested",
    approval: "pending",
    quantity: 10,
    confirmation: result.confirmation,
  };
  assert.equal(isValidAidConfirmation(aid, now), true);
  assert.equal(isSafeAiAidTransition(aid, { status: "committed", approval: "approved" }, now), true);
  assert.equal(isSafeAiAidTransition(aid, { status: "committed", approval: "pending" }, now), false);
});

test("expired, oversized, and rejected confirmations cannot authorize AI aid", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");
  const expired = {
    id: "ai-aid-expired",
    quantity: 4,
    confirmation: {
      reference: "REF-1",
      source: "Official email",
      confirmedAt: "2026-08-31T09:00:00.000Z",
      provider: "Counterpart",
      acceptedQuantity: 4,
      expiresAt: "2026-08-31T10:00:00.000Z",
      status: "accepted",
      recordedBy: "Commander",
      recordedAt: "2026-08-31T09:05:00.000Z",
    },
  };
  assert.equal(isValidAidConfirmation(expired, now), false);

  const oversized = validateAidConfirmationInput({
    reference: "REF-2",
    source: "Official email",
    confirmedAt: "2026-08-31T11:00:00.000Z",
    provider: "Counterpart",
    acceptedQuantity: 5,
  }, 4, "Commander", now);
  assert.match(oversized.error ?? "", /between 0 and 4/);

  const rejected = validateAidConfirmationInput({
    reference: "REF-3",
    source: "Official email",
    confirmedAt: "2026-08-31T11:00:00.000Z",
    provider: "Counterpart",
    acceptedQuantity: 0,
  }, 4, "Commander", now);
  assert.equal(rejected.confirmation?.status, "rejected");
});

test("expiring counterpart confirmations produce a warning only inside the advance window", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");
  const aid = {
    id: "aid-warning",
    resource: "Emergency medical kits",
    confirmation: {
      reference: "REF-WARN",
      source: "Restricted counterpart email",
      confirmedAt: "2026-08-31T11:00:00.000Z",
      provider: "Counterpart",
      status: "accepted",
      expiresAt: "2026-09-01T11:30:00.000Z",
    },
  };
  const warning = getAidConfirmationExpirationWarning(aid, now);
  assert.equal(warning?.reference, "REF-WARN");
  assert.equal(warning?.provider, "Counterpart");
  assert.equal(warning?.remainingMs, 23.5 * 60 * 60 * 1000);
  assert.equal(formatAidExpirationWindow(warning?.remainingMs ?? 0), "23h 30m");
  const notification = buildAidExpirationNotification(warning, aid);
  assert.match(notification.message, /Emergency medical kits|Counterpart/);
  assert.equal(JSON.stringify(notification).includes("REF-WARN"), false);
  assert.equal(JSON.stringify(notification).includes("Restricted counterpart email"), false);
  assert.equal(
    getAidConfirmationExpirationWarning({
      ...aid,
      confirmation: { ...aid.confirmation, expiresAt: "2026-09-02T12:01:00.000Z" },
    }, now),
    null,
  );
  assert.equal(
    getAidConfirmationExpirationWarning({
      ...aid,
      confirmation: { ...aid.confirmation, expiresAt: "2026-08-31T12:00:00.000Z" },
    }, now),
    null,
  );
});