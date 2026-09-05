import { clerkClient, getAuth } from "@clerk/express";
import type { Request } from "express";
import { PARISHES } from "./parishes-data.js";
import { resolveOperatorAuthority } from "./operator-authority.js";
import { isDemoAuthorityEnabled } from "./demo-authority.js";

export type CommandAuthority = {
  role: "national_coordinator" | "parish_manager" | "field_officer";
  parishId?: string;
  name: string;
};

const COMMAND_ROLES = new Set(["national_coordinator", "parish_manager", "field_officer"]);

function demoAuthority(req: Request): CommandAuthority | null {
  if (!isDemoAuthorityEnabled()) return null;
  const role = req.header("x-rvp-demo-role");
  if (!role || !COMMAND_ROLES.has(role)) return null;
  if (role === "national_coordinator") return { role, name: "Incident Commander" };
  if (role === "parish_manager") return { role, parishId: "st-elizabeth", name: "St. Elizabeth Ops Section Chief" };
  return { role: "field_officer", parishId: "st-elizabeth", name: "Officer James" };
}

export async function getCommandAuthority(req: Request): Promise<CommandAuthority | null> {
  const demo = demoAuthority(req);
  if (demo) return demo;
  return getAuthenticatedCommandAuthority(req);
}

export async function getAuthenticatedCommandAuthority(req: Request): Promise<CommandAuthority | null> {
  const { userId } = getAuth(req);
  if (!userId) return null;
  const user = await clerkClient.users.getUser(userId);
  const resolved = resolveOperatorAuthority(
    user.privateMetadata,
    (parishId) => PARISHES.some((parish) => parish.id === parishId),
  );
  if (!resolved || !COMMAND_ROLES.has(resolved.role)) return null;
  return {
    ...resolved,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || `Operator ${userId.slice(-6)}`,
  } as CommandAuthority;
}

export function canCoordinateForParish(authority: CommandAuthority, parishId: string) {
  return authority.role === "national_coordinator" || authority.parishId === parishId;
}