import type { CommunicationAudience } from "./communications-policy.js";

export type CommunicationEventScope = {
  countryCode: string;
  parishId: string | null;
  audience: CommunicationAudience;
  publicStatus: string | null;
  expiresAt: Date | null;
};

type Subscriber = (event: CommunicationEventScope) => boolean;
const subscribers = new Set<Subscriber>();

export function subscribeToCommunicationEvents(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function publishCommunicationRefresh(event: CommunicationEventScope): void {
  for (const subscriber of subscribers) subscriber(event);
}