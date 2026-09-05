import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRegionalAidEvidence,
  parseRegionalAidModelOutput,
} from "./regional-aid.ts";

test("regional aid evidence uses current verified shortfalls and rejects unsupported AI suggestions", () => {
  const result = buildRegionalAidEvidence("westmoreland", "Westmoreland", [{
    id: 2,
    title: "Emergency fuel drop",
    description: "Fuel reserve is low and the delivery route is flooded.",
    type: "resource_request",
    status: "pending",
    createdAt: new Date().toISOString(),
  }]);

  assert.ok(result.candidate);
  assert.equal(result.candidate.resourceType, "fuel");
  assert.equal(result.candidate.quantity, 41000);
  assert.ok(result.candidate.evidence.some((item) => item.status === "verified_operational"));
  assert.ok(result.candidate.evidence.some((item) => item.status === "planning_target"));
  assert.ok(result.candidate.evidence.some((item) => item.status === "incident_signal"));
  assert.ok(result.candidate.candidateCountries.every((country) => country.code !== "JAM"));

  assert.throws(
    () => parseRegionalAidModelOutput(JSON.stringify({
      title: "Unsafe",
      urgency: "high",
      rationale: "Unsafe suggestion",
      requestedMessage: "Unsafe",
      suggestedCountryCodes: ["USA"],
    }), new Set(["HTI", "DOM"])),
    /outside the supported Caribbean planning scope/,
  );
  assert.throws(
    () => parseRegionalAidModelOutput("not-json", new Set(["HTI"])),
    /malformed JSON/,
  );
});

test("regional aid produces an explicit no-recommendation state without verified evidence", () => {
  const result = buildRegionalAidEvidence("st-elizabeth", "St. Elizabeth", []);
  assert.equal(result.candidate, null);
  assert.match(result.reason, /No current verified operational shortfall/);
});