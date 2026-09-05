import { logger } from "./logger";
import { db, sourceRefreshesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

export type DisasterPhase = "preparedness" | "active_response" | "recovery" | "unavailable";
export type SourceStatus = "available" | "unavailable" | "stale";

export interface SupportedCountry {
  code: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  hasOperationalUnits: boolean;
  hazards: string[];
  preparednessScope: string;
}

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  { code: "JAM", name: "Jamaica", region: "Caribbean", latitude: 18.1, longitude: -77.3, hasOperationalUnits: true, hazards: ["Hurricanes", "Tropical storms", "Flooding", "Landslides"], preparednessScope: "Parish operational readiness, resources, dispatch, reports, and recovery workflows are available." },
  { code: "BHS", name: "The Bahamas", region: "Caribbean", latitude: 24.3, longitude: -76.0, hasOperationalUnits: false, hazards: ["Hurricanes", "Storm surge", "Flooding"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
  { code: "BRB", name: "Barbados", region: "Caribbean", latitude: 13.2, longitude: -59.5, hasOperationalUnits: false, hazards: ["Hurricanes", "Tropical storms", "Coastal flooding"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
  { code: "BLZ", name: "Belize", region: "Caribbean", latitude: 17.2, longitude: -88.5, hasOperationalUnits: false, hazards: ["Hurricanes", "Storm surge", "River flooding"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
  { code: "DOM", name: "Dominican Republic", region: "Caribbean", latitude: 18.7, longitude: -70.2, hasOperationalUnits: false, hazards: ["Hurricanes", "Flooding", "Landslides"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
  { code: "HTI", name: "Haiti", region: "Caribbean", latitude: 19.0, longitude: -72.3, hasOperationalUnits: false, hazards: ["Hurricanes", "Flooding", "Landslides"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
  { code: "ATG", name: "Antigua and Barbuda", region: "Caribbean", latitude: 17.1, longitude: -61.8, hasOperationalUnits: false, hazards: ["Hurricanes", "Storm surge", "Drought"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
  { code: "DMA", name: "Dominica", region: "Caribbean", latitude: 15.4, longitude: -61.4, hasOperationalUnits: false, hazards: ["Hurricanes", "Flooding", "Landslides"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
  { code: "GRD", name: "Grenada", region: "Caribbean", latitude: 12.1, longitude: -61.7, hasOperationalUnits: false, hazards: ["Hurricanes", "Tropical storms", "Coastal flooding"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
  { code: "LCA", name: "Saint Lucia", region: "Caribbean", latitude: 13.9, longitude: -60.98, hasOperationalUnits: false, hazards: ["Hurricanes", "Flooding", "Landslides"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
  { code: "VCT", name: "Saint Vincent and the Grenadines", region: "Caribbean", latitude: 13.2, longitude: -61.2, hasOperationalUnits: false, hazards: ["Hurricanes", "Tropical storms", "Flooding"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
  { code: "TTO", name: "Trinidad and Tobago", region: "Caribbean", latitude: 10.7, longitude: -61.2, hasOperationalUnits: false, hazards: ["Tropical storms", "Flooding", "Landslides"], preparednessScope: "National indicators and city reference locations are available; local operational coverage is not onboarded." },
];

const HISTORICAL_EXPOSURE: Record<string, Array<{ name: string; year: number; severity: string }>> = {
  JAM: [{ name: "Hurricane Beryl", year: 2024, severity: "Category 4" }, { name: "Hurricane Ivan", year: 2004, severity: "Category 4" }, { name: "Hurricane Gilbert", year: 1988, severity: "Category 5" }],
  BHS: [{ name: "Hurricane Dorian", year: 2019, severity: "Category 5" }, { name: "Hurricane Matthew", year: 2016, severity: "Category 4" }],
  BRB: [{ name: "Hurricane Beryl", year: 2024, severity: "Category 4" }, { name: "Hurricane Elsa", year: 2021, severity: "Category 1" }],
  BLZ: [{ name: "Hurricane Lisa", year: 2022, severity: "Category 1" }, { name: "Hurricane Earl", year: 2016, severity: "Category 1" }],
  DOM: [{ name: "Hurricane Fiona", year: 2022, severity: "Category 1" }, { name: "Hurricane Maria", year: 2017, severity: "Category 5" }],
  HTI: [{ name: "Hurricane Matthew", year: 2016, severity: "Category 4" }, { name: "Hurricane Grace", year: 2021, severity: "Tropical storm" }],
  ATG: [{ name: "Hurricane Irma", year: 2017, severity: "Category 5" }, { name: "Hurricane Earl", year: 2010, severity: "Category 1" }],
  DMA: [{ name: "Hurricane Maria", year: 2017, severity: "Category 5" }, { name: "Tropical Storm Erika", year: 2015, severity: "Tropical storm" }],
  GRD: [{ name: "Hurricane Ivan", year: 2004, severity: "Category 3" }, { name: "Hurricane Beryl", year: 2024, severity: "Category 1" }],
  LCA: [{ name: "Hurricane Tomas", year: 2010, severity: "Category 1" }, { name: "Hurricane Beryl", year: 2024, severity: "Category 1" }],
  VCT: [{ name: "Hurricane Beryl", year: 2024, severity: "Category 1" }, { name: "Hurricane Elsa", year: 2021, severity: "Category 1" }],
  TTO: [{ name: "Hurricane Beryl", year: 2024, severity: "Category 1" }, { name: "Tropical Storm Bret", year: 2023, severity: "Tropical storm" }],
};

export type AdministrativeFocus = {
  id: string;
  name: string;
  level: "city" | "district" | "parish";
  latitude: number;
  longitude: number;
  scopeNote: string;
};

const REFERENCE_SCOPE = "Reference location only. Infrastructure, finance, and service continuity have not been assessed at this local level.";

export const CARIBBEAN_FOCUS_AREAS: Record<string, AdministrativeFocus[]> = {
  BHS: [{ id: "nassau", name: "Nassau", level: "city", latitude: 25.078, longitude: -77.338, scopeNote: REFERENCE_SCOPE }, { id: "freeport", name: "Freeport", level: "city", latitude: 26.533, longitude: -78.7, scopeNote: REFERENCE_SCOPE }],
  BRB: [{ id: "bridgetown", name: "Bridgetown", level: "city", latitude: 13.097, longitude: -59.614, scopeNote: REFERENCE_SCOPE }, { id: "speightstown", name: "Speightstown", level: "city", latitude: 13.25, longitude: -59.644, scopeNote: REFERENCE_SCOPE }],
  BLZ: [{ id: "belize-city", name: "Belize City", level: "city", latitude: 17.504, longitude: -88.197, scopeNote: REFERENCE_SCOPE }, { id: "belmopan", name: "Belmopan", level: "city", latitude: 17.251, longitude: -88.759, scopeNote: REFERENCE_SCOPE }],
  DOM: [{ id: "santo-domingo", name: "Santo Domingo", level: "city", latitude: 18.486, longitude: -69.931, scopeNote: REFERENCE_SCOPE }, { id: "santiago", name: "Santiago de los Caballeros", level: "city", latitude: 19.451, longitude: -70.697, scopeNote: REFERENCE_SCOPE }],
  HTI: [{ id: "port-au-prince", name: "Port-au-Prince", level: "city", latitude: 18.594, longitude: -72.307, scopeNote: REFERENCE_SCOPE }, { id: "cap-haitien", name: "Cap-Haïtien", level: "city", latitude: 19.759, longitude: -72.202, scopeNote: REFERENCE_SCOPE }],
  ATG: [{ id: "st-johns", name: "St. John's", level: "city", latitude: 17.127, longitude: -61.846, scopeNote: REFERENCE_SCOPE }, { id: "codrington", name: "Codrington", level: "city", latitude: 17.639, longitude: -61.828, scopeNote: REFERENCE_SCOPE }],
  DMA: [{ id: "roseau", name: "Roseau", level: "city", latitude: 15.301, longitude: -61.388, scopeNote: REFERENCE_SCOPE }, { id: "portsmouth", name: "Portsmouth", level: "city", latitude: 15.576, longitude: -61.464, scopeNote: REFERENCE_SCOPE }],
  GRD: [{ id: "st-georges", name: "St. George's", level: "city", latitude: 12.056, longitude: -61.749, scopeNote: REFERENCE_SCOPE }, { id: "gouyave", name: "Gouyave", level: "city", latitude: 12.164, longitude: -61.729, scopeNote: REFERENCE_SCOPE }],
  LCA: [{ id: "castries", name: "Castries", level: "city", latitude: 14.01, longitude: -60.99, scopeNote: REFERENCE_SCOPE }, { id: "vieux-fort", name: "Vieux Fort", level: "city", latitude: 13.72, longitude: -60.95, scopeNote: REFERENCE_SCOPE }],
  VCT: [{ id: "kingstown", name: "Kingstown", level: "city", latitude: 13.157, longitude: -61.225, scopeNote: REFERENCE_SCOPE }, { id: "georgetown", name: "Georgetown", level: "city", latitude: 13.28, longitude: -61.12, scopeNote: REFERENCE_SCOPE }],
  TTO: [{ id: "port-of-spain", name: "Port of Spain", level: "city", latitude: 10.659, longitude: -61.519, scopeNote: REFERENCE_SCOPE }, { id: "scarborough", name: "Scarborough", level: "city", latitude: 11.182, longitude: -60.735, scopeNote: REFERENCE_SCOPE }],
};

export function getAdministrativeFocusAreas(country: SupportedCountry): AdministrativeFocus[] {
  return CARIBBEAN_FOCUS_AREAS[country.code] ?? [];
}

export const CDEMA_CRIS_URL = "https://www.cdema.org/cris/";

type CacheEntry<T> = {
  value?: T;
  lastSuccessfulAt?: string;
  checkedAt: string;
  status: SourceStatus;
  detail?: string;
};

const sourceCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ACTIVE_STORM_TTL_MS = 15 * 60 * 1000;

async function fetchJson<T>(key: string, url: string, ttlMs: number): Promise<CacheEntry<T>> {
  const now = new Date().toISOString();
  const existing = sourceCache.get(key) as CacheEntry<T> | undefined;
  if (existing?.value && Date.now() - new Date(existing.checkedAt).getTime() < ttlMs) {
    return { ...existing, status: existing.status === "unavailable" ? "stale" : existing.status };
  }
  const [persistedRefresh] = existing ? [] : await db
    .select()
    .from(sourceRefreshesTable)
    .where(eq(sourceRefreshesTable.sourceKey, key))
    .orderBy(desc(sourceRefreshesTable.checkedAt))
    .limit(1);

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    const value = (await response.json()) as T;
    const result: CacheEntry<T> = { value, lastSuccessfulAt: now, checkedAt: now, status: "available" };
    sourceCache.set(key, result);
    void db.insert(sourceRefreshesTable).values({
      sourceKey: key,
      countryCode: key.startsWith("world-bank:") ? key.split(":")[1] : null,
      status: result.status,
      lastSuccessfulAt: new Date(now),
      detail: null,
    }).catch((persistError) => logger.warn({ key, persistError }, "Could not persist source refresh record"));
    return result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown upstream failure";
    logger.warn({ key, detail }, "Risk data source unavailable");
    const result: CacheEntry<T> = {
      value: existing?.value,
      lastSuccessfulAt: existing?.lastSuccessfulAt ?? persistedRefresh?.lastSuccessfulAt?.toISOString(),
      checkedAt: now,
      status: existing?.value ? "stale" : "unavailable",
      detail,
    };
    sourceCache.set(key, result);
    void db.insert(sourceRefreshesTable).values({
      sourceKey: key,
      countryCode: key.startsWith("world-bank:") ? key.split(":")[1] : null,
      status: result.status,
      lastSuccessfulAt: result.lastSuccessfulAt ? new Date(result.lastSuccessfulAt) : null,
      detail,
    }).catch((persistError) => logger.warn({ key, persistError }, "Could not persist failed source refresh record"));
    return result;
  }
}

const WORLD_BANK_INDICATORS = [
  { code: "NY.GDP.PCAP.CD", label: "GDP per capita (current US$)", factor: "Economic capacity" },
  { code: "SP.DYN.LE00.IN", label: "Life expectancy at birth", factor: "Population health capacity" },
  { code: "IT.NET.USER.ZS", label: "Individuals using the Internet (% of population)", factor: "Information access" },
] as const;

export async function getWorldBankIndicators(countryCode: string) {
  const results = await Promise.all(WORLD_BANK_INDICATORS.map(async (indicator) => {
    const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator.code}?format=json&per_page=8`;
    const entry = await fetchJson<Array<unknown>>( `world-bank:${countryCode}:${indicator.code}`, url, CACHE_TTL_MS);
    const rows = Array.isArray(entry.value?.[1]) ? (entry.value[1] as Array<{ value?: number | null; date?: string }>) : [];
    const observation = rows.find((row) => typeof row.value === "number");
    return {
      code: indicator.code,
      name: indicator.label,
      factor: indicator.factor,
      value: observation?.value ?? null,
      unit: indicator.code === "NY.GDP.PCAP.CD" ? "US$" : indicator.code === "SP.DYN.LE00.IN" ? "years" : "%",
      date: observation?.date ?? null,
      sourceName: "World Bank Open Data",
      sourceUrl: url,
      sourceStatus: entry.status,
      lastSuccessfulRefresh: entry.lastSuccessfulAt ?? null,
      unavailableDetail: entry.status === "available" ? null : (entry.detail ?? "No successful refresh is available."),
    };
  }));

  return results;
}

type NHCStorm = {
  id?: string;
  name?: string;
  classification?: string;
  intensity?: string;
  latitudeNumeric?: number;
  longitudeNumeric?: number;
  lastUpdate?: string;
  publicAdvisory?: { url?: string; issuance?: string };
};

function distanceKm(a: SupportedCountry, storm: NHCStorm): number | null {
  if (typeof storm.latitudeNumeric !== "number" || typeof storm.longitudeNumeric !== "number") return null;
  const latDistance = (a.latitude - storm.latitudeNumeric) * 111;
  const longDistance = (a.longitude - storm.longitudeNumeric) * 111 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.round(Math.sqrt(latDistance ** 2 + longDistance ** 2));
}

export async function getActiveStorms(country: SupportedCountry) {
  const url = "https://www.nhc.noaa.gov/CurrentStorms.json";
  const entry = await fetchJson<{ activeStorms?: NHCStorm[] }>("nhc:current-storms", url, ACTIVE_STORM_TTL_MS);
  const storms = entry.value?.activeStorms ?? [];
  return {
    sourceName: "NOAA National Hurricane Center — Current Storms",
    sourceUrl: url,
    sourceStatus: entry.status,
    lastSuccessfulRefresh: entry.lastSuccessfulAt ?? null,
    unavailableDetail: entry.status === "available" ? null : (entry.detail ?? "No successful refresh is available."),
    coverageNote: "NHC Current Storms covers the North Atlantic, eastern North Pacific, and central North Pacific. It is not a complete global warning feed; consult the responsible regional meteorological service.",
    storms: storms.map((storm) => {
      const distance = distanceKm(country, storm);
      return {
        id: storm.id ?? `${storm.name ?? "storm"}-${storm.lastUpdate ?? "unknown"}`,
        name: storm.name ?? "Unnamed system",
        classification: storm.classification ?? "Unknown",
        intensity: storm.intensity ? `${storm.intensity} kt` : null,
        lastUpdate: storm.lastUpdate ?? null,
        advisoryUrl: storm.publicAdvisory?.url ?? null,
        distanceKm: distance,
        relevance: distance == null ? "Location unavailable" : distance < 750 ? "Monitor closely — this is not an official impact forecast." : "Active basin context — not an official local warning.",
      };
    }),
  };
}

export function getCurrentThreatAdvisories(
  country: SupportedCountry,
  activeTropicalCyclones: Awaited<ReturnType<typeof getActiveStorms>>,
) {
  const liveAdvisories = activeTropicalCyclones.storms.map((storm) => ({
    id: `tropical-cyclone:${storm.id}`,
    title: `${storm.name} — ${storm.classification}`,
    category: "tropical_cyclone",
    status: "current" as const,
    severity: storm.classification,
    summary: storm.relevance,
    sourceName: activeTropicalCyclones.sourceName,
    sourceUrl: storm.advisoryUrl ?? activeTropicalCyclones.sourceUrl,
    sourceStatus: activeTropicalCyclones.sourceStatus,
    lastUpdated: activeTropicalCyclones.lastSuccessfulRefresh,
  }));

  const watchlist = country.hazards.map((hazard) => ({
    id: `hazard-watchlist:${country.code}:${hazard.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: hazard,
    category: "planning_hazard",
    status: "watchlist" as const,
    severity: "monitor",
    summary: "Planning watchlist only. No live incident advisory is being asserted for this hazard.",
    sourceName: "RVP country hazard profile",
    sourceUrl: null,
    sourceStatus: "available" as const,
    lastUpdated: null,
  }));

  if (activeTropicalCyclones.sourceStatus === "unavailable" && liveAdvisories.length === 0) {
    return [{
      id: `tropical-cyclone-feed:${country.code}`,
      title: "Tropical cyclone feed unavailable",
      category: "tropical_cyclone",
      status: "unavailable" as const,
      severity: "unknown",
      summary: activeTropicalCyclones.unavailableDetail ?? "No current cyclone value is available.",
      sourceName: activeTropicalCyclones.sourceName,
      sourceUrl: activeTropicalCyclones.sourceUrl,
      sourceStatus: activeTropicalCyclones.sourceStatus,
      lastUpdated: activeTropicalCyclones.lastSuccessfulRefresh,
    }, ...watchlist];
  }

  return [...liveAdvisories, ...watchlist];
}

export function getHistoricalExposure(countryCode: string) {
  return {
    sourceName: "NOAA/NHC historical tropical cyclone archive",
    sourceUrl: "https://www.nhc.noaa.gov/data/",
    sourceStatus: "available" as SourceStatus,
    lastSuccessfulRefresh: null,
    methodology: "Curated benchmark events from the NHC historical archive. They describe past exposure and are not a live warning.",
    events: (HISTORICAL_EXPOSURE[countryCode] ?? []).map((event) => ({ ...event, hazardType: "tropical_cyclone" })),
  };
}

function normalise(value: number | null, maximum: number): number | null {
  return value == null ? null : Math.max(0, Math.min(100, (value / maximum) * 100));
}

export function calculateResilienceScore(
  indicators: Awaited<ReturnType<typeof getWorldBankIndicators>>,
  historicalEvents: Array<{ severity: string }>,
  activeStorms: Array<{ distanceKm: number | null; classification: string }>,
) {
  const gdp = normalise(indicators.find((item) => item.code === "NY.GDP.PCAP.CD")?.value ?? null, 50_000);
  const life = normalise(indicators.find((item) => item.code === "SP.DYN.LE00.IN")?.value ?? null, 85);
  const internet = normalise(indicators.find((item) => item.code === "IT.NET.USER.ZS")?.value ?? null, 100);
  const available = [
    { label: "Economic capacity", value: gdp, weight: 0.4 },
    { label: "Population health capacity", value: life, weight: 0.35 },
    { label: "Information access", value: internet, weight: 0.25 },
  ].filter((factor): factor is { label: string; value: number; weight: number } => factor.value != null);
  const normalisedWeight = available.reduce((sum, factor) => sum + factor.weight, 0);
  const capacity = available.length ? available.reduce((sum, factor) => sum + factor.value * (factor.weight / normalisedWeight), 0) : null;
  const historicalPenalty = Math.min(20, historicalEvents.length * 5);
  const nearbyStorm = activeStorms.some((storm) => storm.distanceKm != null && storm.distanceKm < 750);
  const advisoryPenalty = nearbyStorm ? 12 : 0;
  const score = capacity == null ? null : Math.round(Math.max(0, Math.min(100, capacity - historicalPenalty - advisoryPenalty)));

  return {
    modelVersion: "planning-resilience-v1",
    score,
    label: score == null ? "Unavailable" : score >= 65 ? "Higher planning capacity" : score >= 40 ? "Moderate planning capacity" : "Lower planning capacity",
    factors: [
      ...available.map((factor) => ({ name: factor.label, value: Math.round(factor.value), weight: `${Math.round(factor.weight * 100)}% of capacity input`, direction: "raises score" })),
      { name: "Historical tropical-cyclone exposure", value: historicalEvents.length, weight: "up to -20 points", direction: "reduces score" },
      { name: "Current advisory proximity", value: nearbyStorm ? 1 : 0, weight: "up to -12 points", direction: "reduces score when a system is within 750 km" },
    ],
    uncertainty: available.length === 3 ? "Medium — development indicators have different reporting years; hazard proximity is not an impact forecast." : "High — one or more source indicators are unavailable.",
    limitations: "This is an explainable planning index, not a forecast, safety rating, guarantee of recovery, or substitute for official disaster-management direction.",
    calculation: "Capacity is a weighted blend of World Bank development indicators. Historical exposure and a nearby active-system advisory are transparent deductions, capped to prevent either input from dominating.",
  };
}

export function suggestPhase(activeStorms: Array<{ distanceKm: number | null }>, sourceStatus: SourceStatus) {
  if (sourceStatus !== "available") {
    return {
      phase: "unavailable" as DisasterPhase,
      reason: `No phase was inferred because the NOAA/NHC source is ${sourceStatus}. Consult official national guidance and the source-health notice.`,
      source: "NOAA/NHC Current Storms — phase inference unavailable",
    };
  }
  const closest = activeStorms
    .map((storm) => storm.distanceKm)
    .filter((distance): distance is number => distance != null)
    .sort((a, b) => a - b)[0];
  return {
    phase: closest != null && closest < 750 ? "active_response" as DisasterPhase : "preparedness" as DisasterPhase,
    reason: closest != null && closest < 750
      ? "Suggested because NHC lists an active system within 750 km. Confirm through official national guidance."
      : "No NHC active system is currently within the platform’s 750 km monitoring threshold.",
    source: "NOAA/NHC Current Storms — suggested phase only",
  };
}

export const BUSINESS_DIRECTORY = [
  { id: "jam-bank-1", name: "National Commercial Bank — Kingston", category: "bank", location: "Kingston", status: "unknown", evidenceSource: "Directory location only", confidence: "unknown", lastUpdated: null },
  { id: "jam-hotel-1", name: "Montego Bay Resort Operations", category: "hotel", location: "St. James", status: "unknown", evidenceSource: "Directory location only", confidence: "unknown", lastUpdated: null },
  { id: "jam-school-1", name: "St. Elizabeth Technical High School", category: "school", location: "St. Elizabeth", status: "unknown", evidenceSource: "Directory location only", confidence: "unknown", lastUpdated: null },
  { id: "jam-health-1", name: "Kingston Public Hospital", category: "health_facility", location: "Kingston", status: "unknown", evidenceSource: "Directory location only", confidence: "unknown", lastUpdated: null },
  { id: "jam-fuel-1", name: "Kingston Emergency Fuel Depot", category: "fuel", location: "Kingston", status: "unknown", evidenceSource: "Directory location only", confidence: "unknown", lastUpdated: null },
  { id: "jam-food-1", name: "Southern Food Distribution Hub", category: "food", location: "Clarendon", status: "unknown", evidenceSource: "Directory location only", confidence: "unknown", lastUpdated: null },
  { id: "jam-logistics-1", name: "Port of Kingston Logistics", category: "logistics", location: "Kingston", status: "unknown", evidenceSource: "Directory location only", confidence: "unknown", lastUpdated: null },
];