import {
  PARISH_OBSERVATION_DATASETS,
  PARISH_OBSERVATION_RECORDS,
  type ParishObservationDataset,
} from "./parish-observations.snapshot.js";
import {
  PARISH_OBSERVATION_SOURCE_HEALTH,
  type ParishObservationSourceHealth,
} from "./parish-observations-health.js";

export interface ParishData {
  id: string;
  name: string;
  readinessScore: number;
  readinessLevel: "Critical" | "At risk" | "Moderate";
  bottleneck: string;
  population: number;
  area: number;
  capitalCity: string;
}

export type ParishReadinessEvidenceType = "verified_observation" | "planning_proxy" | "unavailable";
export type ParishReadinessSourceStatus = "available" | "unavailable" | "stale";
export type ParishReadinessFreshnessState = "current" | "historical" | "stale" | "unavailable";
export type ParishReadinessSourcePermission = "public_attribution" | "public_record";

export interface ParishReadinessSource {
  id: string;
  name: string;
  authority: string;
  sourceUrl: string;
  permission: ParishReadinessSourcePermission;
  permissionNote: string;
  observationDate: string | null;
  freshnessState: ParishReadinessFreshnessState;
  sourceStatus: ParishReadinessSourceStatus;
  lastSuccessfulRefresh: string | null;
  lastCheckedAt: string | null;
  contentSha256: string | null;
  refreshExpectation: string;
  detail: string | null;
}

export interface ParishReadinessMetric {
  label: string;
  value: number | null;
  unit: string;
  sourceRecordId: string | null;
  sourceId: string | null;
  sourceName: string;
  sourceUrl: string | null;
  sourceStatus: ParishReadinessSourceStatus;
  observationDate: string | null;
  freshnessState: ParishReadinessFreshnessState;
  lastUpdated: string | null;
  lastCheckedAt: string | null;
  refreshExpectation: string;
  unavailableDetail: string | null;
  dataLayers: string[];
  evidenceType: ParishReadinessEvidenceType;
  note: string;
}

export interface ParishReadinessFactor {
  name: string;
  score: number | null;
  weight: string;
  direction: string;
  metrics: ParishReadinessMetric[];
}

export interface ParishReadinessTrendPoint {
  label: string;
  score: number;
  kind: "observed" | "planning_proxy" | "scenario_projection";
}

export interface ParishReadinessEvidence {
  factors: ParishReadinessFactor[];
  sources: ParishReadinessSource[];
  trend: ParishReadinessTrendPoint[];
  trendSummary: string;
  peerComparison: {
    rank: number;
    totalParishes: number;
    nationalAverage: number;
    lowestParish: string;
    lowestScore: number;
  };
  scopeNote: string;
}

export const PARISHES: ParishData[] = [
  {
    id: "kingston",
    name: "Kingston",
    readinessScore: 72,
    readinessLevel: "Moderate",
    bottleneck: "Clear Route B1 (Spanish Town Road) — unlocks hospital access, fuel depot, and 3 utility staging areas.",
    population: 96052,
    area: 22,
    capitalCity: "Kingston",
  },
  {
    id: "st-andrew",
    name: "St. Andrew",
    readinessScore: 68,
    readinessLevel: "Moderate",
    bottleneck: "Restore communications tower at Jack's Hill to re-establish emergency radio coverage across the central corridor.",
    population: 573369,
    area: 453,
    capitalCity: "Half Way Tree",
  },
  {
    id: "st-thomas",
    name: "St. Thomas",
    readinessScore: 44,
    readinessLevel: "Critical",
    bottleneck: "Restore ferry link to Kingston — the only reliable supply route when Route A4 floods.",
    population: 95018,
    area: 743,
    capitalCity: "Morant Bay",
  },
  {
    id: "portland",
    name: "Portland",
    readinessScore: 56,
    readinessLevel: "At risk",
    bottleneck: "Pre-position emergency supply depot at Buff Bay before hurricane season; mountain roads cut access for 72+ hours post-storm.",
    population: 81871,
    area: 814,
    capitalCity: "Port Antonio",
  },
  {
    id: "st-mary",
    name: "St. Mary",
    readinessScore: 63,
    readinessLevel: "Moderate",
    bottleneck: "Repair and reinforce Annotto Bay bridge — only crossing point for eastern supply corridor during flooding events.",
    population: 113615,
    area: 611,
    capitalCity: "Port Maria",
  },
  {
    id: "st-ann",
    name: "St. Ann",
    readinessScore: 74,
    readinessLevel: "Moderate",
    bottleneck: "Establish backup power for Ocho Rios water treatment facility — loss causes cascading health emergency within 48 hours.",
    population: 172362,
    area: 1213,
    capitalCity: "St. Ann's Bay",
  },
  {
    id: "trelawny",
    name: "Trelawny",
    readinessScore: 60,
    readinessLevel: "At risk",
    bottleneck: "Upgrade Falmouth fuel reserve capacity — current depot holds only 72-hour supply for emergency vehicles.",
    population: 75164,
    area: 875,
    capitalCity: "Falmouth",
  },
  {
    id: "st-james",
    name: "St. James",
    readinessScore: 71,
    readinessLevel: "Moderate",
    bottleneck: "Secure Montego Bay hospital backup generator — failure during peak hurricane season risks collapse of regional trauma care.",
    population: 183811,
    area: 595,
    capitalCity: "Montego Bay",
  },
  {
    id: "hanover",
    name: "Hanover",
    readinessScore: 53,
    readinessLevel: "At risk",
    bottleneck: "Pre-position fuel reserves at Savanna-la-Mar depot and restore fishing community access roads at Lucea.",
    population: 69994,
    area: 450,
    capitalCity: "Lucea",
  },
  {
    id: "westmoreland",
    name: "Westmoreland",
    readinessScore: 49,
    readinessLevel: "Critical",
    bottleneck: "Pre-position fuel reserves at Savanna-la-Mar depot before storm season peak — flood-prone lowlands cut all road access.",
    population: 144849,
    area: 807,
    capitalCity: "Savanna-la-Mar",
  },
  {
    id: "st-elizabeth",
    name: "St. Elizabeth",
    readinessScore: 65,
    readinessLevel: "Moderate",
    bottleneck: "Reinforce Black River bridge — only crossing linking southern supply route to interior parishes under flood conditions.",
    population: 151179,
    area: 1212,
    capitalCity: "Black River",
  },
  {
    id: "manchester",
    name: "Manchester",
    readinessScore: 70,
    readinessLevel: "Moderate",
    bottleneck: "Establish redundant communications link from Mandeville to Kingston — fiber cable runs through flood-prone Bog Walk Gorge.",
    population: 189797,
    area: 830,
    capitalCity: "Mandeville",
  },
  {
    id: "clarendon",
    name: "Clarendon",
    readinessScore: 61,
    readinessLevel: "At risk",
    bottleneck: "Upgrade May Pen flood management infrastructure — the town sits in the Rio Minho flood plain and loses road access within 6 hours of sustained rainfall.",
    population: 245103,
    area: 1196,
    capitalCity: "May Pen",
  },
  {
    id: "st-catherine",
    name: "St. Catherine",
    readinessScore: 66,
    readinessLevel: "Moderate",
    bottleneck: "Clear and maintain Bog Walk Gorge evacuation route — sole inland corridor from Kingston Metro area, susceptible to rockslides during Category 3+ events.",
    population: 516218,
    area: 1192,
    capitalCity: "Spanish Town",
  },
];

export const PARISH_MAP = new Map(PARISHES.map((p) => [p.id, p]));

function sourceMetadata(sourceId: string, sources: ParishReadinessSource[]) {
  const source = sources.find((item) => item.id === sourceId);
  if (!source) {
    throw new Error(`Parish readiness source is not registered: ${sourceId}`);
  }
  return source;
}

function buildSourceRegistry(now = new Date()): ParishReadinessSource[] {
  return PARISH_OBSERVATION_DATASETS.map((dataset: ParishObservationDataset) => {
    const health = PARISH_OBSERVATION_SOURCE_HEALTH.find((item: ParishObservationSourceHealth) => item.sourceId === dataset.id);
    const lastSuccessfulAt = health?.lastSuccessfulAt ?? null;
    const ageDays = lastSuccessfulAt
      ? (now.getTime() - new Date(lastSuccessfulAt).getTime()) / 86_400_000
      : Number.POSITIVE_INFINITY;
    const overdue = ageDays > dataset.refreshCadenceDays;
    const failed = health?.status === "unavailable";
    const sourceStatus: ParishReadinessSourceStatus = !lastSuccessfulAt
      ? "unavailable"
      : failed || overdue
        ? "stale"
        : "available";
    const detail = failed
      ? health?.detail ?? "The latest refresh failed; the last verified snapshot is retained as stale."
      : overdue
        ? `Refresh overdue by ${Math.floor(ageDays - dataset.refreshCadenceDays)} days; the last verified snapshot is retained as stale.`
        : null;
    return {
      id: dataset.id,
      name: dataset.name,
      authority: dataset.authority,
      sourceUrl: dataset.sourceUrl,
      permission: "public_record",
      permissionNote: dataset.permissionNote,
      observationDate: dataset.observationDate,
      freshnessState: sourceStatus === "available" ? "historical" : sourceStatus,
      sourceStatus,
      lastSuccessfulRefresh: lastSuccessfulAt,
      lastCheckedAt: health?.lastAttemptAt ?? null,
      contentSha256: health?.contentSha256 ?? null,
      refreshExpectation: dataset.refreshExpectation,
      detail,
    };
  });
}

const unavailableMetric = (label: string, unit: string, dataLayers: string[]): ParishReadinessMetric => ({
  label,
  value: null,
  unit,
  sourceRecordId: null,
  sourceId: null,
  sourceName: "Not onboarded for this parish",
  sourceUrl: null,
  sourceStatus: "unavailable",
  observationDate: null,
  freshnessState: "unavailable",
  lastUpdated: null,
  lastCheckedAt: null,
  refreshExpectation: "No authoritative parish-level source has been approved for this metric.",
  unavailableDetail: "No successful parish-level refresh is available.",
  dataLayers,
  evidenceType: "unavailable",
  note: "No parish-level observation is currently onboarded. The readiness score remains a planning proxy.",
});

const planningMetric = (
  label: string,
  value: number,
  unit: string,
  sourceName: string,
  lastUpdated: string,
  dataLayers: string[],
  note: string,
  sourceId?: string,
): ParishReadinessMetric => ({
  label,
  value,
  unit,
  sourceRecordId: null,
  sourceId: sourceId ?? null,
  sourceName,
  sourceUrl: null,
  sourceStatus: Date.now() - new Date(lastUpdated).getTime() > 365 * 86_400_000 ? "stale" : "available",
  observationDate: lastUpdated,
  freshnessState: Date.now() - new Date(lastUpdated).getTime() > 365 * 86_400_000 ? "stale" : "current",
  lastUpdated,
  lastCheckedAt: null,
  refreshExpectation: "Planning proxy freshness is evaluated against a 365-day review window; it is never substituted for a verified parish observation.",
  unavailableDetail: null,
  dataLayers,
  evidenceType: "planning_proxy",
  note,
});

const verifiedMetric = (
  label: string,
  value: number,
  unit: string,
  observationDate: string,
  dataLayers: string[],
  note: string,
  sourceId: string,
  sourceRecordId: string,
  sources: ParishReadinessSource[],
): ParishReadinessMetric => ({
  label,
  value,
  unit,
  sourceRecordId,
  sourceId,
  sourceName: sourceMetadata(sourceId, sources).name,
  sourceUrl: sourceMetadata(sourceId, sources).sourceUrl,
  sourceStatus: sourceMetadata(sourceId, sources).sourceStatus,
  observationDate,
  freshnessState: sourceMetadata(sourceId, sources).freshnessState,
  lastUpdated: observationDate,
  lastCheckedAt: sourceMetadata(sourceId, sources).lastCheckedAt,
  refreshExpectation: sourceMetadata(sourceId, sources).refreshExpectation,
  unavailableDetail: sourceMetadata(sourceId, sources).detail,
  dataLayers,
  evidenceType: "verified_observation",
  note,
});

const KINGSTON_FACTORS: ParishReadinessFactor[] = [
  {
    name: "Economic capacity",
    score: 16,
    weight: "25% of parish readiness",
    direction: "raises readiness when continuity capacity is stronger",
    metrics: [
      planningMetric("GDP per capita index", 42, "index / 100", "World Bank Open Data", "2023-12-31", ["L6 Economic Resilience"], "National observation normalized for parish planning; not a direct Kingston measurement."),
      planningMetric("Business continuity planning coverage", 28, "% of mapped organizations", "PIOJ planning reference", "2026-08-17", ["L6 Economic Resilience"], "Planning baseline; not a live survey of every Kingston organization."),
      planningMetric("Access to emergency credit facilities", 31, "% of assessed organizations", "RVP planning baseline", "2026-08-17", ["L6 Economic Resilience"], "Planning proxy used to expose the model input."),
      planningMetric("Private-sector disaster insurance penetration", 18, "% of assessed organizations", "RVP planning baseline", "2026-08-17", ["L6 Economic Resilience"], "Planning proxy; coverage has not been independently verified."),
    ],
  },
  {
    name: "Population health capacity",
    score: 84,
    weight: "35% of parish readiness",
    direction: "raises readiness when health access and reach are stronger",
    metrics: [
      planningMetric("Hospital bed density", 2.1, "beds / 1,000 people", "PIOJ planning reference", "2026-08-17", ["L3 Community Vulnerability", "L5 Critical Services"], "Planning baseline; facility availability is not inferred from directory listings."),
      planningMetric("Routine vaccination coverage", 84, "% of target population", "Ministry of Health planning reference", "2026-07-01", ["L3 Community Vulnerability"], "Planning reference, not a live vaccination registry."),
      planningMetric("Community health worker reach", 71, "% of target communities", "RVP planning baseline", "2026-08-17", ["L3 Community Vulnerability", "L5 Critical Services"], "Planning proxy used to show the factor's underlying input."),
    ],
  },
  {
    name: "Information access",
    score: 68,
    weight: "20% of parish readiness",
    direction: "raises readiness when warnings and communications can reach people",
    metrics: [
      planningMetric("Individuals using the internet", 71, "% of population", "World Bank Open Data", "2023-12-31", ["L7 Information & Communications"], "National observation used as a planning proxy for parish communications reach."),
      planningMetric("Emergency alert reach", 59, "% of mapped households", "RVP planning baseline", "2026-08-17", ["L7 Information & Communications"], "Planning proxy; alert delivery is not a live warning confirmation."),
      planningMetric("Mobile network coverage", 91, "% of populated area", "PIOJ planning reference", "2026-08-17", ["L7 Information & Communications"], "Planning reference; service continuity during an incident is not guaranteed."),
    ],
  },
  {
    name: "Historical tropical-cyclone exposure",
    score: 3,
    weight: "up to -20 points",
    direction: "reduces readiness when benchmark exposure is higher",
    metrics: [
      planningMetric("Benchmark events in the planning archive", 3, "events", "NOAA/NHC historical archive", "2024-07-01", ["L2 Hazard Exposure"], "Historical exposure describes past events and is not a current warning."),
    ],
  },
  {
    name: "Current advisory proximity",
    score: 0,
    weight: "up to -12 points",
    direction: "reduces readiness only when a system is within 750 km",
    metrics: [
      planningMetric("Systems within monitoring threshold", 0, "systems", "NOAA/NHC Current Storms", "2026-08-31", ["L2 Hazard Exposure"], "Monitoring context only; this is not an impact forecast or official local warning."),
    ],
  },
];

const GENERIC_FACTOR_DEFINITIONS = [
  ["Economic capacity", "25% of parish readiness", "raises readiness when continuity capacity is stronger", [["GDP per capita index", "index / 100"], ["Business continuity planning coverage", "% of mapped organizations"]], ["L6 Economic Resilience"]],
  ["Population health capacity", "35% of parish readiness", "raises readiness when health access and reach are stronger", [["Hospital bed density", "beds / 1,000 people"], ["Vaccination coverage", "% of target population"]], ["L3 Community Vulnerability", "L5 Critical Services"]],
  ["Information access", "20% of parish readiness", "raises readiness when warnings and communications can reach people", [["Emergency alert reach", "% of mapped households"], ["Mobile network coverage", "% of populated area"]], ["L7 Information & Communications"]],
  ["Historical tropical-cyclone exposure", "up to -20 points", "reduces readiness when benchmark exposure is higher", [["Benchmark events in the planning archive", "events"]], ["L2 Hazard Exposure"]],
  ["Current advisory proximity", "up to -12 points", "reduces readiness only when a system is within 750 km", [["Systems within monitoring threshold", "systems"]], ["L2 Hazard Exposure"]],
] as const;

function localPopulationMetric(parish: ParishData, sources: ParishReadinessSource[]) {
  const record = PARISH_OBSERVATION_RECORDS[parish.id];
  if (!record) return unavailableMetric("Usually resident population", "people", ["L3 Community Vulnerability"]);
  return verifiedMetric(
    "Usually resident population",
    record.usuallyResidentPopulation,
    "people",
    "2011-04-04",
    ["L3 Community Vulnerability"],
    "Direct STATIN parish table value. Historical population context is displayed without changing the readiness score.",
    "statin-census-2011-usual-resident-population",
    `${record.sourceRecordId}:TOTAL-POPULATION`,
    sources,
  );
}

function localCommunicationDifficultyMetric(parish: ParishData, sources: ParishReadinessSource[]) {
  const record = PARISH_OBSERVATION_RECORDS[parish.id];
  if (!record) return unavailableMetric("Communication difficulty", "% of population age 5+", ["L3 Community Vulnerability", "L7 Information & Communications"]);
  const difficultyCount = record.communicationSomeDifficulty + record.communicationMuchDifficulty + record.communicationCannotDo;
  const difficultyRate = Math.round((difficultyCount / record.communicationPopulation) * 1000) / 10;
  return verifiedMetric(
    "Communication difficulty",
    difficultyRate,
    "% of population age 5+",
    "2011-04-04",
    ["L3 Community Vulnerability", "L7 Information & Communications"],
    `Calculated from the STATIN parish row: ${difficultyCount.toLocaleString("en-US")} people reporting some difficulty, much difficulty, or unable to communicate, divided by ${record.communicationPopulation.toLocaleString("en-US")} people age 5+. This does not change the score.`,
    "statin-census-2011-communication-difficulty",
    `${record.sourceRecordId}:COMMUNICATION-DIFFICULTY`,
    sources,
  );
}

function fallbackFactors(parish: ParishData, sources: ParishReadinessSource[]): ParishReadinessFactor[] {
  return GENERIC_FACTOR_DEFINITIONS.map(([name, weight, direction, metricDefinitions, layers]) => ({
    name,
    score: null,
    weight,
    direction,
    metrics: [
      ...metricDefinitions.map(([label, unit]) => unavailableMetric(label, unit, [...layers])),
      ...(name === "Population health capacity"
        ? [localPopulationMetric(parish, sources), localCommunicationDifficultyMetric(parish, sources)]
        : []),
    ],
  }));
}

function buildTrend(parish: ParishData): ParishReadinessTrendPoint[] {
  const baseline = parish.readinessScore;
  const planningValues = [Math.max(0, baseline + 6), Math.max(0, baseline + 3), Math.max(0, baseline + 1), baseline];
  return [
    { label: "Jun 02", score: planningValues[0], kind: "planning_proxy" },
    { label: "Jul 02", score: planningValues[1], kind: "planning_proxy" },
    { label: "Aug 02", score: planningValues[2], kind: "planning_proxy" },
    { label: "Aug 31", score: planningValues[3], kind: "planning_proxy" },
    { label: "Cat 3 projection", score: Math.max(0, baseline - 34), kind: "scenario_projection" },
  ];
}

function getPeerComparison(parishId: string) {
  const ranked = [...PARISHES].sort((a, b) => b.readinessScore - a.readinessScore);
  const parishIndex = ranked.findIndex((item) => item.id === parishId);
  const average = Math.round(PARISHES.reduce((sum, item) => sum + item.readinessScore, 0) / PARISHES.length);
  const lowest = [...PARISHES].sort((a, b) => a.readinessScore - b.readinessScore)[0];
  return {
    rank: parishIndex + 1,
    totalParishes: PARISHES.length,
    nationalAverage: average,
    lowestParish: lowest.name,
    lowestScore: lowest.readinessScore,
  };
}

export function getParishReadinessEvidence(parishId: string, now = new Date()): ParishReadinessEvidence | null {
  const parish = PARISH_MAP.get(parishId);
  if (!parish) return null;
  const sources = buildSourceRegistry(now);
  const isKingston = parish.id === "kingston";
  const factors = isKingston
    ? KINGSTON_FACTORS.map((factor) => ({
        ...factor,
        metrics: factor.name === "Population health capacity"
          ? [...factor.metrics, localPopulationMetric(parish, sources), localCommunicationDifficultyMetric(parish, sources)]
          : factor.metrics,
      }))
    : fallbackFactors(parish, sources);
  return {
    factors,
    sources,
    trend: buildTrend(parish),
    trendSummary: isKingston
      ? "90-day planning proxy moved from 78 to 72. The Category 3 value is a scenario projection, not an observed historical score."
      : `90-day planning proxy ends at ${parish.readinessScore}. No observed parish time series is currently onboarded; the Category 3 value is a scenario projection.`,
    peerComparison: getPeerComparison(parishId),
    scopeNote: isKingston
      ? "Kingston evidence combines directly imported STATIN parish observations with clearly labelled planning proxies. Local context does not change the planning score or provide an operational guarantee."
      : "This parish has directly imported historical STATIN observations, but factor scores and the readiness time series remain planning proxies until additional local service and continuity observations are onboarded.",
  };
}
