import assert from "node:assert/strict";
import test from "node:test";
import { canReviewPublicAlert, canViewAudience } from "./communications-policy.ts";

const authorities = {
  commander: { role: "national_coordinator", countryCode: "JAM" },
  manager: { role: "parish_manager", countryCode: "JAM", parishId: "kingston" },
  field: { role: "field_officer", countryCode: "JAM", parishId: "kingston" },
  partner: { role: "private_sector_partner", countryCode: "JAM" },
  admin: { role: "system_admin" },
};

test("audience visibility only exposes targeted roles", () => {
  assert.equal(canViewAudience(authorities.commander, "incident_commanders"), true);
  assert.equal(canViewAudience(authorities.manager, "incident_commanders"), false);
  assert.equal(canViewAudience(authorities.field, "command_team"), false);
  assert.equal(canViewAudience(authorities.field, "field_teams"), true);
  assert.equal(canViewAudience(authorities.partner, "unified_command_partners"), true);
  assert.equal(canViewAudience(authorities.manager, "unified_command_partners"), false);
  assert.equal(canViewAudience(authorities.admin, "unified_command_partners"), true);
});

test("only regional administrators and incident commanders review public alerts", () => {
  assert.equal(canReviewPublicAlert(authorities.admin), true);
  assert.equal(canReviewPublicAlert(authorities.commander), true);
  assert.equal(canReviewPublicAlert(authorities.manager), false);
  assert.equal(canReviewPublicAlert(authorities.partner), false);
});