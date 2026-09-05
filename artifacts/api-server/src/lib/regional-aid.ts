import { randomUUID } from "node:crypto";
import { SUPPORTED_COUNTRIES } from "./risk-intelligence.js";
import { getOperationalStatuses } from "./resource-store.js";

export const REGIONAL_AID_METADATA_KIND = "regional_aid_request";
const MAX_EVIDENCE_AGE_MS = 36 * 60 * 60 * 1000;

export type RegionalAidEvidence = {
  label: string;
  value: string;
  source: string;
  observedAt: string | null;
  status: "verified_operational" | "planning_target" | "incident_signal";
};

export type RegionalAidCountrySuggestion = {
  code: string;
  name: string;
  reason: string;
  planningOnly: true;
};

export type RegionalAidMetadata = {
  kind: typeof REGIONAL_AID_METADATA_KIND;
  draftId: string;
  title: string;
  resourceType: string;
  resourceLabel: string;
  quantity: number;
  unit: string;
  destination: string;
  urgency: "critical" | "high" | "medium";
  rationale: string;
  requestedMessage: string;
  evidence: RegionalAidEvidence[];
  suggestedCountries: RegionalAidCountrySuggestion[];
  limitations: string[];
  aiProvider: "Replit AI Integrations — OpenAI";
  aiModel: string;
  generatedAt: string;
};

export type RegionalAidIncident = {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
};

type AidCandidate = {
  status: ReturnType<typeof getOperationalStatuses>[number];
  freshnessHours: number;
};

function distanceKm(latitude: number, longitude: number) {
  const latDistance = (18.1 - latitude) * 111;
  const longDistance = (-77.3 - longitude) * 111 * Math.cos((18.1 * Math.PI) / 180);
  return Math.round(Math.sqrt(latDistance ** 2 + longDistance ** 2));
}

function candidateCountries() {
  return SUPPORTED_COUNTRIES
    .filter((country) => country.code !== "JAM" && !country.hasOperationalUnits)
    .map((country) => ({
      country,
      distance: distanceKm(country.latitude, country.longitude),
    }))
    .sort((a, b) => a.distance - b.distance);
}

function incidentRelevance(incident: RegionalAidIncident, resourceType: string) {
  const haystack = `${incident.title} ${incident.description} ${incident.type}`.toLowerCase();
  const resourceTerms = resourceType.replaceAll("_", " ").split(" ");
  return resourceTerms.some((term) => haystack.includes(term)) || incident.type === "resource_request";
}

export function buildRegionalAidEvidence(parishId: string, parishName: string, incidents: RegionalAidIncident[], now = Date.now()) {
  const operationalShortfalls: AidCandidate[] = getOperationalStatuses(parishId)
    .filter((status) =>
      status.operationalStatus === "shortfall"
      && status.shortfallQuantity != null
      && status.verifiedAvailableQuantity != null
      && status.targetQuantity != null
      && status.lastOperationalUpdateAt != null,
    )
    .map((status) => ({
      status,
      freshnessHours: (now - new Date(status.lastOperationalUpdateAt!).getTime()) / (60 * 60 * 1000),
    }))
    .filter((item) => item.freshnessHours >= 0 && item.freshnessHours <= MAX_EVIDENCE_AGE_MS / (60 * 60 * 1000))
    .sort((a, b) => {
      const aRatio = (a.status.shortfallQuantity ?? 0) / Math.max(1, a.status.targetQuantity ?? 1);
      const bRatio = (b.status.shortfallQuantity ?? 0) / Math.max(1, b.status.targetQuantity ?? 1);
      return bRatio - aRatio;
    });

  if (operationalShortfalls.length === 0) {
    return {
      candidate: null,
      reason: "No current verified operational shortfall with a matching target is available for this parish.",
      incidents: incidents.filter((incident) => incident.status === "pending").slice(0, 5),
    };
  }

  const selected = operationalShortfalls[0];
  const incidentSignals = incidents
    .filter((incident) => incident.status === "pending" || incident.status === "approved")
    .filter((incident) => incidentRelevance(incident, selected.status.resourceType))
    .filter((incident) => now - new Date(incident.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000)
    .slice(0, 5);
  const incidentsForEvidence = incidentSignals.length > 0
    ? incidentSignals
    : incidents.filter((incident) => incident.status !== "rejected").slice(0, 3);
  const resourceLabel = selected.status.resourceType.replaceAll("_", " ");
  const destination = `${parishName} emergency logistics coordination`;
  const evidence: RegionalAidEvidence[] = [
    {
      label: `${resourceLabel} verified available`,
      value: `${selected.status.verifiedAvailableQuantity!.toLocaleString()} ${selected.status.unit}`,
      source: selected.status.operationalEvidenceNote ?? "Operational resource verification record",
      observedAt: selected.status.lastOperationalUpdateAt,
      status: "verified_operational",
    },
    {
      label: `${resourceLabel} target`,
      value: `${selected.status.targetQuantity!.toLocaleString()} ${selected.status.unit}`,
      source: selected.status.targetEvidenceReference ?? "Parish emergency logistics plan",
      observedAt: selected.status.targetEvidenceCapturedAt,
      status: "planning_target",
    },
    ...incidentsForEvidence.map((incident) => ({
      label: `${incident.type.replaceAll("_", " ")} · ${incident.title}`,
      value: incident.description,
      source: `Incident Command review item #${incident.id}`,
      observedAt: incident.createdAt,
      status: "incident_signal" as const,
    })),
  ];

  return {
    candidate: {
      draftId: randomUUID(),
      parishId,
      parishName,
      resourceType: selected.status.resourceType,
      resourceLabel,
      quantity: selected.status.shortfallQuantity!,
      unit: selected.status.unit,
      destination,
      evidence,
      incidents: incidentsForEvidence,
      candidateCountries: candidateCountries().slice(0, 6).map(({ country, distance }) => ({
        code: country.code,
        name: country.name,
        distanceKm: distance,
        hazards: country.hazards,
        scope: country.preparednessScope,
      })),
    },
    reason: null,
    incidents: incidentsForEvidence,
  };
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.trim().slice(0, maxLength);
}

export function parseRegionalAidModelOutput(value: string, allowedCodes: Set<string>) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("AI returned malformed JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("AI returned an invalid request draft");
  const raw = parsed as Record<string, unknown>;
  if (!Array.isArray(raw.suggestedCountryCodes) || raw.suggestedCountryCodes.length < 1) {
    throw new Error("AI did not return a regional counterpart suggestion");
  }
  const codes = raw.suggestedCountryCodes.filter((code): code is string => typeof code === "string" && allowedCodes.has(code));
  if (codes.length !== raw.suggestedCountryCodes.length) throw new Error("AI suggested a country outside the supported Caribbean planning scope");
  return {
    title: cleanText(raw.title, "Regional mutual-aid request", 160),
    urgency: raw.urgency === "critical" || raw.urgency === "high" || raw.urgency === "medium" ? raw.urgency : "high",
    rationale: cleanText(raw.rationale, "Verified parish resource shortfall requires regional coordination.", 1200),
    requestedMessage: cleanText(raw.requestedMessage, "Please confirm whether your national coordination mechanism can review this request. Capacity and availability remain unverified.", 1200),
    suggestedCountryCodes: [...new Set(codes)].slice(0, 3),
  } as const;
}

export async function generateRegionalAidDraft(
  parishId: string,
  parishName: string,
  incidents: RegionalAidIncident[],
): Promise<{ metadata: RegionalAidMetadata | null; reason: string | null }> {
  const evidenceContext = buildRegionalAidEvidence(parishId, parishName, incidents);
  if (!evidenceContext.candidate) return { metadata: null, reason: evidenceContext.reason };

  const candidate = evidenceContext.candidate;
  const countries = candidateCountries().slice(0, 6);
  const allowedCodes = new Set(countries.map(({ country }) => country.code));
  const system = [
    "You are an emergency logistics drafting assistant for Incident Command.",
    "Return JSON only with keys title, urgency, rationale, requestedMessage, suggestedCountryCodes.",
    "Use only the evidence supplied. Never claim a counterpart has stock, capacity, approval, willingness, an open facility, a delivery commitment, or an ETA.",
    "The requested quantity, unit, destination, and resource are authoritative supplied values; do not change them.",
    "Suggested country codes must come only from the supplied candidate list. Explain suggestions as planning-only coordination options.",
  ].join(" ");
  const prompt = JSON.stringify({
    need: {
      resourceType: candidate.resourceType,
      resourceLabel: candidate.resourceLabel,
      quantity: candidate.quantity,
      unit: candidate.unit,
      destination: candidate.destination,
    },
    evidence: candidate.evidence,
    incidentSignals: candidate.incidents,
    countryCandidates: countries.map(({ country, distance }) => ({
      code: country.code,
      name: country.name,
      approximateDistanceKmFromJamaica: distance,
      hazards: country.hazards,
      planningScope: country.preparednessScope,
    })),
  });

  const { openai } = await import("@workspace/integrations-openai-ai-server");
  const completion = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  const output = completion.choices[0]?.message?.content;
  if (!output) throw new Error("AI returned an empty request draft");
  const model = parseRegionalAidModelOutput(output, allowedCodes);
  const countryMap = new Map(countries.map(({ country, distance }) => [country.code, { country, distance }]));
  const suggestedCountries = model.suggestedCountryCodes.map((code) => {
    const match = countryMap.get(code)!;
    return {
      code,
      name: match.country.name,
      reason: `Planning suggestion based on regional proximity and shared hazard context (${match.distance} km approximate). Confirm capacity and willingness through official channels.`,
      planningOnly: true as const,
    };
  });

  return {
    reason: null,
    metadata: {
      kind: REGIONAL_AID_METADATA_KIND,
      draftId: candidate.draftId,
      title: model.title,
      resourceType: candidate.resourceType,
      resourceLabel: candidate.resourceLabel,
      quantity: candidate.quantity,
      unit: candidate.unit,
      destination: candidate.destination,
      urgency: model.urgency,
      rationale: model.rationale,
      requestedMessage: model.requestedMessage,
      evidence: candidate.evidence,
      suggestedCountries,
      limitations: [
        "Suggested counterparts are planning options only; no national capacity or willingness has been verified.",
        "The request is pending Incident Command approval and must be confirmed through official channels before any action.",
        "AI-generated wording does not change the verified quantity, source status, readiness score, or recovery forecast.",
      ],
      aiProvider: "Replit AI Integrations — OpenAI",
      aiModel: "gpt-5.6-terra",
      generatedAt: new Date().toISOString(),
    },
  };
}