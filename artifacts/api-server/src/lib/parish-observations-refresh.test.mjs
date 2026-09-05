import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const OLD_SUCCESS = "2026-01-01T00:00:00Z";
const OLD_POPULATION_HASH = "a".repeat(64);
const OLD_COMMUNICATION_HASH = "b".repeat(64);

function populationFixture() {
  const parishes = ["Kingston", "St Andrew", "St Thomas", "Portland", "St Mary", "St Ann", "Trelawny", "St James", "Hanover", "Westmoreland", "St Elizabeth", "Manchester", "Clarendon", "St Catherine"];
  return `<table>${parishes.map((parish, index) => `<tr><td>${parish}</td><td>${1000 + index}</td><td>0</td><td>0</td><td>0</td></tr>`).join("")}</table>`;
}

test("a partial source failure never promotes health beyond the retained snapshot", async () => {
  const directory = await mkdtemp(join(tmpdir(), "parish-refresh-"));
  const snapshotPath = join(directory, "parish-observations.snapshot.ts");
  const healthPath = join(directory, "parish-observations-health.ts");
  const retainedSnapshot = "export const PARISH_OBSERVATION_RECORDS = { retained: true };";
  await writeFile(snapshotPath, retainedSnapshot);
  await writeFile(healthPath, `export const PARISH_OBSERVATION_SOURCE_HEALTH = [
    { sourceId: "statin-census-2011-usual-resident-population", lastSuccessfulAt: "${OLD_SUCCESS}", contentSha256: "${OLD_POPULATION_HASH}" },
    { sourceId: "statin-census-2011-communication-difficulty", lastSuccessfulAt: "${OLD_SUCCESS}", contentSha256: "${OLD_COMMUNICATION_HASH}" },
  ];`);

  const server = createServer((request, response) => {
    if (request.url === "/population") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end(populationFixture());
      return;
    }
    response.writeHead(503);
    response.end("failed");
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    await assert.rejects(execFileAsync(process.execPath, [
      resolve("scripts/import-parish-observations.mjs"),
    ], {
      cwd: resolve("."),
      env: {
        ...process.env,
        PARISH_OBSERVATIONS_OUTPUT_DIR: directory,
        PARISH_POPULATION_SOURCE_URL: `http://127.0.0.1:${address.port}/population`,
        PARISH_COMMUNICATION_SOURCE_URL: `http://127.0.0.1:${address.port}/communication`,
      },
    }));
    assert.equal(await readFile(snapshotPath, "utf8"), retainedSnapshot);
    const health = await readFile(healthPath, "utf8");
    assert.equal((health.match(new RegExp(OLD_SUCCESS, "g")) ?? []).length, 2);
    assert.ok(health.includes(OLD_POPULATION_HASH));
    assert.ok(health.includes(OLD_COMMUNICATION_HASH));
    assert.equal((health.match(/"status": "unavailable"/g) ?? []).length, 2);
    assert.equal((health.match(/retained snapshot was not promoted/g) ?? []).length, 2);
  } finally {
    server.close();
    await rm(directory, { recursive: true, force: true });
  }
});