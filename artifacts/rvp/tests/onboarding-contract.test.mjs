import assert from "node:assert/strict";
import test from "node:test";

import {
  onboardingQueryKey,
  onboardingQueryOptions,
  onboardingStaleTime,
  parseOnboardingResponse,
} from "../src/lib/onboarding-contract.ts";

const roles = [
  "national_coordinator",
  "parish_manager",
  "field_officer",
  "system_admin",
  "private_sector_partner",
];

function responseFor(role) {
  const parishId = role === "parish_manager" || role === "field_officer"
    ? "kingston"
    : undefined;

  return JSON.parse(JSON.stringify({
    isAuthenticated: true,
    emailVerified: true,
    authority: { role, parishId },
    profile: {
      requestedRole: role,
      status: "active",
      fullName: "Test Operator",
      organization: "RVP",
      jobTitle: "Coordinator",
      phone: "555-0100",
      parishId: parishId ?? null,
      agency: null,
      jurisdiction: null,
      station: null,
      responsibilities: null,
      sector: null,
      capabilities: null,
    },
  }));
}

for (const role of roles) {
  test(`accepts the serialized onboarding response for ${role}`, () => {
    const parsed = parseOnboardingResponse(responseFor(role));

    assert.equal(parsed.authority?.role, role);
    assert.equal(parsed.authority?.parishId, role === "parish_manager" || role === "field_officer"
      ? "kingston"
      : null);
  });
}

test("rejects an unsupported onboarding status", () => {
  const response = responseFor("field_officer");
  response.profile.status = "suspended";

  assert.throws(() => parseOnboardingResponse(response));
});

test("provides stable shared query options for every onboarding consumer", () => {
  const firstConsumer = onboardingQueryOptions();
  const secondConsumer = onboardingQueryOptions();

  assert.strictEqual(firstConsumer.queryKey, onboardingQueryKey);
  assert.strictEqual(secondConsumer.queryKey, onboardingQueryKey);
  assert.equal(firstConsumer.queryFn, secondConsumer.queryFn);
  assert.equal(firstConsumer.staleTime, onboardingStaleTime);
  assert.equal(secondConsumer.staleTime, onboardingStaleTime);
  assert.equal(firstConsumer.retry, false);
  assert.equal(secondConsumer.retry, false);
});