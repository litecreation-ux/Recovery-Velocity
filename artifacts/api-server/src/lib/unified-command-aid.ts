type AidRecord = Record<string, unknown>;

export type AidConfirmationStatus = "accepted" | "partial" | "rejected" | "expired";
export const AID_EXPIRATION_WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;

export type AidConfirmation = {
  reference: string;
  source: string;
  confirmedAt: string;
  provider: string;
  acceptedQuantity: number;
  expiresAt: string | null;
  status: AidConfirmationStatus;
  recordedBy: string;
  recordedAt: string;
};

export type AidExpirationWarning = {
  warningKey: string;
  provider: string;
  reference: string;
  expiresAt: string;
  remainingMs: number;
};

export type AidExpirationNotificationChannel = {
  id: string;
  label: string;
  kind: "email";
  status: "active" | "inactive";
  approved: boolean;
  transport?: "sendgrid";
  recipient?: string;
};

export type AidExpirationNotificationDelivery = {
  warningKey: string;
  aidId: string;
  destinationId: string;
  status: "pending" | "delivered" | "failed" | "unknown";
  attempts: number;
  attemptedAt: string;
  deliveredAt: string | null;
  providerMessageId: string | null;
  error: string | null;
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateAidConfirmationInput(
  input: {
    reference?: unknown;
    source?: unknown;
    confirmedAt?: unknown;
    provider?: unknown;
    acceptedQuantity?: unknown;
    expiresAt?: unknown;
  },
  requestedQuantity: unknown,
  recordedBy: string,
  recordedAt = new Date(),
): { confirmation: AidConfirmation | null; error: string | null } {
  const reference = nonEmptyString(input.reference);
  const source = nonEmptyString(input.source);
  const confirmedAt = parseDate(input.confirmedAt);
  const provider = nonEmptyString(input.provider);
  const quantity = typeof input.acceptedQuantity === "number" ? input.acceptedQuantity : NaN;
  const requested = typeof requestedQuantity === "number" ? requestedQuantity : NaN;
  const expiresAtValue = input.expiresAt === undefined || input.expiresAt === "" || input.expiresAt === null
    ? null
    : parseDate(input.expiresAt);

  if (!reference || !source || !confirmedAt || !provider) {
    return { confirmation: null, error: "Confirmation reference, source, timestamp, and named provider are required." };
  }
  if (!Number.isFinite(requested) || requested <= 0) {
    return { confirmation: null, error: "The aid request quantity is invalid." };
  }
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > requested) {
    return { confirmation: null, error: `Accepted quantity must be between 0 and ${requested}.` };
  }
  if (confirmedAt.getTime() > recordedAt.getTime() + 5 * 60 * 1000) {
    return { confirmation: null, error: "Confirmation timestamp cannot be in the future." };
  }
  if (input.expiresAt !== undefined && input.expiresAt !== "" && input.expiresAt !== null && !expiresAtValue) {
    return { confirmation: null, error: "Confirmation expiration must be a valid timestamp." };
  }
  if (expiresAtValue && expiresAtValue.getTime() <= confirmedAt.getTime()) {
    return { confirmation: null, error: "Confirmation expiration must be after the confirmation timestamp." };
  }
  if (expiresAtValue && expiresAtValue.getTime() <= recordedAt.getTime()) {
    return { confirmation: null, error: "This confirmation has already expired. Record a current counterpart response." };
  }

  const status: AidConfirmationStatus = quantity === 0
    ? "rejected"
    : quantity < requested ? "partial" : "accepted";

  return {
    confirmation: {
      reference,
      source,
      confirmedAt: confirmedAt.toISOString(),
      provider,
      acceptedQuantity: quantity,
      expiresAt: expiresAtValue?.toISOString() ?? null,
      status,
      recordedBy,
      recordedAt: recordedAt.toISOString(),
    },
    error: null,
  };
}

export function isAidConfirmationExpired(record: AidRecord, at = new Date()) {
  const confirmation = record.confirmation;
  if (!confirmation || typeof confirmation !== "object") return false;
  const expiresAt = parseDate((confirmation as AidRecord).expiresAt);
  return Boolean(expiresAt && expiresAt.getTime() <= at.getTime());
}

export function getAidConfirmationExpirationWarning(
  record: AidRecord,
  at = new Date(),
  warningWindowMs = AID_EXPIRATION_WARNING_WINDOW_MS,
): AidExpirationWarning | null {
  const confirmation = record.confirmation;
  if (!confirmation || typeof confirmation !== "object") return null;
  const value = confirmation as AidRecord;
  if (value.status !== "accepted" && value.status !== "partial") return null;
  const expiresAt = parseDate(value.expiresAt);
  const provider = nonEmptyString(value.provider);
  const reference = nonEmptyString(value.reference);
  if (!expiresAt || !provider || !reference) return null;

  const remainingMs = expiresAt.getTime() - at.getTime();
  if (remainingMs <= 0 || remainingMs > warningWindowMs) return null;
  return {
    warningKey: getAidExpirationWarningKey(record, value),
    provider,
    reference,
    expiresAt: expiresAt.toISOString(),
    remainingMs,
  };
}

export function getAidExpirationWarningKey(record: AidRecord, confirmation?: AidRecord) {
  const value = confirmation ?? (record.confirmation && typeof record.confirmation === "object"
    ? record.confirmation as AidRecord
    : {});
  return [String(record.id ?? ""), String(value.confirmedAt ?? ""), String(value.expiresAt ?? "")].join(":");
}

export function buildAidExpirationNotification(warning: AidExpirationWarning, record: AidRecord) {
  return {
    subject: `Aid confirmation nearing expiration: ${String(record.resource ?? record.id)}`,
    message: `Verified aid from ${warning.provider} expires in ${formatAidExpirationWindow(warning.remainingMs)} (${warning.expiresAt}). Renew the counterpart confirmation before committed movement is cancelled.`,
  };
}

export function formatAidExpirationWindow(remainingMs: number) {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  return `${minutes}m`;
}

export function isValidAidConfirmation(record: AidRecord, at = new Date()) {
  const confirmation = record.confirmation;
  if (!confirmation || typeof confirmation !== "object") return false;
  const value = confirmation as AidRecord;
  const status = value.status;
  const acceptedQuantity = value.acceptedQuantity;
  const requestedQuantity = typeof record.requestedQuantity === "number"
    ? record.requestedQuantity
    : record.quantity;
  return (status === "accepted" || status === "partial")
    && typeof acceptedQuantity === "number"
    && acceptedQuantity > 0
    && typeof requestedQuantity === "number"
    && acceptedQuantity <= requestedQuantity
    && !isAidConfirmationExpired(record, at);
}

export function isSafeAiAidTransition(record: AidRecord, changes: AidRecord, at = new Date()) {
  if (typeof record.id !== "string" || !record.id.startsWith("ai-aid-")) return true;
  const status = typeof changes.status === "string" ? changes.status : record.status;
  const approval = typeof changes.approval === "string" ? changes.approval : record.approval;
  if ((status === "requested" || status === "cancelled")
    && (approval === "pending" || approval === "declined")) return true;
  return (status === "requested" || status === "committed" || status === "en_route" || status === "delivered")
    && approval === "approved"
    && isValidAidConfirmation({ ...record, ...changes }, at);
}