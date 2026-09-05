import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = process.env.PARISH_OBSERVATIONS_OUTPUT_DIR
  ? resolve(process.env.PARISH_OBSERVATIONS_OUTPUT_DIR)
  : resolve(artifactDir, "src/lib");
const snapshotPath = resolve(outputDir, "parish-observations.snapshot.ts");
const healthPath = resolve(outputDir, "parish-observations-health.ts");
const retrievedAt = new Date().toISOString();

const sources = [
  {
    id: "statin-census-2011-usual-resident-population",
    url: process.env.PARISH_POPULATION_SOURCE_URL ?? "https://statinja.gov.jm/Census/PopCensus/PopulationUsuallyResidentinJamaicabyParish.aspx",
    width: 5,
  },
  {
    id: "statin-census-2011-communication-difficulty",
    url: process.env.PARISH_COMMUNICATION_SOURCE_URL ?? "https://statinja.gov.jm/Census/PopCensus/Population%205%20Years%20Old%20and%20Over%20by%20Level%20of%20Difficulty%20related%20to%20Communicating%20by%20Parish.aspx",
    width: 7,
  },
];

const parishAliases = {
  Kingston: "kingston",
  "St Andrew": "st-andrew",
  "St Thomas": "st-thomas",
  Portland: "portland",
  "St Mary": "st-mary",
  "St Ann": "st-ann",
  Trelawny: "trelawny",
  Trewlany: "trelawny",
  "St James": "st-james",
  Hanover: "hanover",
  Westmoreland: "westmoreland",
  "St Elizabeth": "st-elizabeth",
  Manchester: "manchester",
  Clarendon: "clarendon",
  "St Catherine": "st-catherine",
};

function cellsFromHtml(html) {
  return [...html.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim());
}

function number(value) {
  const parsed = Number(value.replaceAll(",", ""));
  if (!Number.isFinite(parsed)) throw new Error(`Invalid source number: ${value}`);
  return parsed;
}

function rowsFromHtml(html, width) {
  const cells = cellsFromHtml(html);
  const rows = new Map();
  for (let index = 0; index < cells.length; index += 1) {
    const parishId = parishAliases[cells[index]];
    if (parishId) rows.set(parishId, cells.slice(index, index + width));
  }
  if (rows.size !== 14) throw new Error(`Expected 14 parish rows; found ${rows.size}`);
  return rows;
}

function healthModule(entries) {
  return `export interface ParishObservationSourceHealth {
  sourceId: string;
  status: "available" | "unavailable";
  lastAttemptAt: string;
  lastSuccessfulAt: string | null;
  contentSha256: string | null;
  detail: string | null;
}

export const PARISH_OBSERVATION_SOURCE_HEALTH: ParishObservationSourceHealth[] = ${JSON.stringify(entries, null, 2)};
`;
}

async function atomicWrite(path, content) {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, path);
}

const results = await Promise.allSettled(sources.map(async (source) => {
  const response = await fetch(source.url, { headers: { Accept: "text/html" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`STATIN returned ${response.status}`);
  const html = await response.text();
  return {
    source,
    rows: rowsFromHtml(html, source.width),
    contentSha256: createHash("sha256").update(html).digest("hex"),
  };
}));

const previousHealthSource = await readFile(healthPath, "utf8").catch(() => "");
const previousById = new Map([...previousHealthSource.matchAll(/"?sourceId"?:\s*"([^"]+)"[\s\S]*?"?lastSuccessfulAt"?:\s*("[^"]+"|null)[\s\S]*?"?contentSha256"?:\s*("[^"]+"|null)/g)]
  .map((match) => [match[1], {
    lastSuccessfulAt: match[2] === "null" ? null : JSON.parse(match[2]),
    contentSha256: match[3] === "null" ? null : JSON.parse(match[3]),
  }]));

if (results.some((result) => result.status === "rejected")) {
  const failures = results.flatMap((result, index) => result.status === "rejected"
    ? [`${sources[index].id}: ${result.reason instanceof Error ? result.reason.message : "Unknown refresh failure"}`]
    : []);
  const failureDetail = `Batch refresh failed; retained snapshot was not promoted. ${failures.join("; ")}`;
  const retainedHealth = sources.map(({ id: sourceId }) => {
    const previous = previousById.get(sourceId);
    return {
      sourceId,
      status: "unavailable",
      lastAttemptAt: retrievedAt,
      lastSuccessfulAt: previous?.lastSuccessfulAt ?? null,
      contentSha256: previous?.contentSha256 ?? null,
      detail: failureDetail,
    };
  });
  await atomicWrite(healthPath, healthModule(retainedHealth));
  console.error("One or more parish observation refreshes failed. The previous snapshot was preserved and source health was marked unavailable.");
  process.exit(1);
}

const population = results[0].value.rows;
const communication = results[1].value.rows;
const records = Object.values(parishAliases).filter((value, index, all) => all.indexOf(value) === index).map((parishId) => {
  const populationRow = population.get(parishId);
  const communicationRow = communication.get(parishId);
  return [
    parishId,
    {
      parishId,
      sourceRecordId: `STATIN-PHC2011-${parishId.toUpperCase().replaceAll("-", "-")}`,
      usuallyResidentPopulation: number(populationRow[1]),
      communicationPopulation: number(communicationRow[1]),
      communicationSomeDifficulty: number(communicationRow[3]),
      communicationMuchDifficulty: number(communicationRow[4]),
      communicationCannotDo: number(communicationRow[5]),
    },
  ];
});

const previousSnapshot = await readFile(snapshotPath, "utf8");
const prefix = previousSnapshot.slice(0, previousSnapshot.indexOf("export const PARISH_OBSERVATION_RECORDS"));
await atomicWrite(snapshotPath, `${prefix}export const PARISH_OBSERVATION_RECORDS: Record<string, ParishObservationRecord> = ${JSON.stringify(Object.fromEntries(records), null, 2)};\n`);
const promotedHealth = results.map((result, index) => ({
  sourceId: sources[index].id,
  status: "available",
  lastAttemptAt: retrievedAt,
  lastSuccessfulAt: retrievedAt,
  contentSha256: result.value.contentSha256,
  detail: null,
}));
await atomicWrite(healthPath, healthModule(promotedHealth));
console.log(`Imported ${records.length} parish records from ${sources.length} STATIN tables.`);