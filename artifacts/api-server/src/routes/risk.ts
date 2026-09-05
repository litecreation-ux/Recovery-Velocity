import { Router, type IRouter } from "express";
import {
  BUSINESS_DIRECTORY,
  CDEMA_CRIS_URL,
  SUPPORTED_COUNTRIES,
  calculateResilienceScore,
  getAdministrativeFocusAreas,
  getActiveStorms,
  getCurrentThreatAdvisories,
  getHistoricalExposure,
  getWorldBankIndicators,
  suggestPhase,
  type DisasterPhase,
} from "../lib/risk-intelligence";
import {
  GetBusinessContinuityResponse,
  GetCountryRiskOverviewResponse,
  ListRiskCountriesResponse,
} from "@workspace/api-zod";
import {
  administrativeUnitsTable,
  countriesTable,
  db,
  resilienceSnapshotsTable,
  riskObservationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { PARISHES } from "../lib/parishes-data";

const router: IRouter = Router();

function countryFromParam(countryCode: string) {
  return SUPPORTED_COUNTRIES.find((country) => country.code === countryCode.toUpperCase());
}

router.get("/risk/countries", (_req, res): void => {
  const countries = SUPPORTED_COUNTRIES.map(({ latitude: _latitude, longitude: _longitude, ...country }) => country);
  res.json(ListRiskCountriesResponse.parse(countries));
});

router.get("/risk/countries/:countryCode/overview", async (req, res): Promise<void> => {
  const countryCode = Array.isArray(req.params.countryCode) ? req.params.countryCode[0] : req.params.countryCode;
  const country = countryFromParam(countryCode);
  if (!country) {
    res.status(404).json({ error: "Country is not currently supported" });
    return;
  }

  const [worldBankIndicators, activeTropicalCyclones] = await Promise.all([
    getWorldBankIndicators(country.code),
    getActiveStorms(country),
  ]);
  const historicalExposure = getHistoricalExposure(country.code);
  const currentThreatAdvisories = getCurrentThreatAdvisories(country, activeTropicalCyclones);
  const resilience = calculateResilienceScore(worldBankIndicators, historicalExposure.events, activeTropicalCyclones.storms);
  const suggested = suggestPhase(activeTropicalCyclones.storms, activeTropicalCyclones.sourceStatus);

  await Promise.all([
    db.insert(countriesTable).values({
      iso3Code: country.code,
      name: country.name,
      region: country.region,
    }).onConflictDoNothing(),
    db.insert(riskObservationsTable).values(worldBankIndicators.map((indicator) => ({
      countryCode: country.code,
      indicatorCode: indicator.code,
      indicatorName: indicator.name,
      value: indicator.value,
      observationDate: indicator.date,
      sourceName: indicator.sourceName,
      sourceUrl: indicator.sourceUrl,
    }))),
    db.insert(resilienceSnapshotsTable).values({
      countryCode: country.code,
      modelVersion: resilience.modelVersion,
      score: resilience.score,
      factorsJson: JSON.stringify(resilience.factors),
      limitations: resilience.limitations,
    }),
    ...(country.code === "JAM"
      ? [db.insert(administrativeUnitsTable).values(PARISHES.map((parish) => ({
          countryCode: country.code,
          externalId: parish.id,
          name: parish.name,
          level: "parish",
          parentExternalId: null,
        }))).onConflictDoNothing()]
      : []),
  ]);

  res.json(GetCountryRiskOverviewResponse.parse({
    country: {
      code: country.code,
      name: country.name,
      region: country.region,
      hasOperationalUnits: country.hasOperationalUnits,
      hazards: country.hazards,
      preparednessScope: country.preparednessScope,
    },
    phase: { phase: suggested.phase, source: suggested.source, reason: suggested.reason, decidedAt: new Date().toISOString(), isOverride: false },
    worldBankIndicators,
    activeTropicalCyclones,
    currentThreatAdvisories,
    historicalExposure,
    resilience,
    administrativeFocusAreas: getAdministrativeFocusAreas(country),
    regionalReference: {
      name: "CDEMA CRIS",
      url: CDEMA_CRIS_URL,
      note: "Regional reference link only. RVP does not ingest or scrape CDEMA CRIS data.",
    },
  }));
});

router.get("/risk/countries/:countryCode/business-continuity", (req, res): void => {
  const countryCode = Array.isArray(req.params.countryCode) ? req.params.countryCode[0] : req.params.countryCode;
  const country = countryFromParam(countryCode);
  if (!country) {
    res.status(404).json({ error: "Country is not currently supported" });
    return;
  }
  const organizations = country.code === "JAM" ? BUSINESS_DIRECTORY : [];
  res.json(GetBusinessContinuityResponse.parse({
    countryCode: country.code,
    organizations,
    note: country.code === "JAM"
      ? "Availability claims appear only with a timestamp and self-reported or partner-verified evidence. Directory-only places remain unknown."
      : "No essential-service continuity directory has been onboarded for this country. Locations and availability are not inferred.",
  }));
});

export default router;