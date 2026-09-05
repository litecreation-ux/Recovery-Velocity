export interface ParishObservationSourceHealth {
  sourceId: string;
  status: "available" | "unavailable";
  lastAttemptAt: string;
  lastSuccessfulAt: string | null;
  contentSha256: string | null;
  detail: string | null;
}

export const PARISH_OBSERVATION_SOURCE_HEALTH: ParishObservationSourceHealth[] = [
  {
    "sourceId": "statin-census-2011-usual-resident-population",
    "status": "available",
    "lastAttemptAt": "2026-08-31T01:07:48.440Z",
    "lastSuccessfulAt": "2026-08-31T01:07:48.440Z",
    "contentSha256": "0a31ab4a984262d35275d4c76124d127824871153bc91013516bc0e1a5102707",
    "detail": null
  },
  {
    "sourceId": "statin-census-2011-communication-difficulty",
    "status": "available",
    "lastAttemptAt": "2026-08-31T01:07:48.440Z",
    "lastSuccessfulAt": "2026-08-31T01:07:48.440Z",
    "contentSha256": "a69d4809e57d56330e397df6a1c856b8fd2deaa257b0f7d9e83c48bf2488add8",
    "detail": null
  }
];
