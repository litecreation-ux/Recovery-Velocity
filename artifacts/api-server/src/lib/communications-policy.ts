import type { OperatorAuthority } from "./operator-authority.js";

export type CommunicationAudience =
  | "authorized_scope"
  | "incident_commanders"
  | "command_team"
  | "field_teams"
  | "unified_command_partners"
  | "public";

export function canViewAudience(authority: OperatorAuthority, audience: CommunicationAudience): boolean {
  if (authority.role === "system_admin" || audience === "authorized_scope" || audience === "public") return true;
  if (audience === "incident_commanders") return authority.role === "national_coordinator";
  if (audience === "command_team") return authority.role === "national_coordinator" || authority.role === "parish_manager";
  if (audience === "field_teams") return authority.role === "parish_manager" || authority.role === "field_officer";
  return authority.role === "private_sector_partner";
}

export function canReviewPublicAlert(authority: OperatorAuthority): boolean {
  return authority.role === "system_admin" || authority.role === "national_coordinator";
}