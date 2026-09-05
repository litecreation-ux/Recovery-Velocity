import { ReplitConnectors } from "@replit/connectors-sdk";
import type { AidExpirationNotificationChannel } from "./unified-command-aid.js";

export type AidExpirationNotificationPayload = {
  subject: string;
  message: string;
};

export type AidExpirationNotificationDispatchResult = {
  providerMessageId: string | null;
};

export class AidExpirationNotificationDispatchError extends Error {
  readonly outcome: "failed" | "unknown";

  constructor(message: string, outcome: "failed" | "unknown") {
    super(message);
    this.name = "AidExpirationNotificationDispatchError";
    this.outcome = outcome;
  }
}

export type AidExpirationNotificationDispatcher = (
  channel: AidExpirationNotificationChannel,
  payload: AidExpirationNotificationPayload,
) => Promise<AidExpirationNotificationDispatchResult>;

export const sendAidExpirationNotification: AidExpirationNotificationDispatcher = async (channel, payload) => {
  if (channel.kind !== "email" || channel.transport !== "sendgrid" || !channel.recipient) {
    throw new AidExpirationNotificationDispatchError(
      "No active transport is configured for this notification destination.",
      "failed",
    );
  }
  const sender = process.env.SENDGRID_FROM_EMAIL?.trim();
  if (!sender) {
    throw new AidExpirationNotificationDispatchError(
      "The SendGrid sender address is not configured.",
      "failed",
    );
  }

  const connectors = new ReplitConnectors();
  let response: Response;
  try {
    response = await connectors.proxy("sendgrid", "/v3/mail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: channel.recipient }],
          custom_args: { notification_type: "aid_expiration_warning" },
        }],
        from: { email: sender },
        subject: payload.subject,
        content: [{ type: "text/plain", value: payload.message }],
        ...(process.env.NODE_ENV === "production"
          ? {}
          : { mail_settings: { sandbox_mode: { enable: true } } }),
      }),
    });
  } catch {
    throw new AidExpirationNotificationDispatchError(
      "SendGrid submission outcome is unknown; automatic retry is disabled to prevent duplicate alerts.",
      "unknown",
    );
  }
  if (!response.ok) {
    throw new AidExpirationNotificationDispatchError(
      `SendGrid rejected the notification with status ${response.status}.`,
      "failed",
    );
  }
  return { providerMessageId: response.headers.get("x-message-id") };
};