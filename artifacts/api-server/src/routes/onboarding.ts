import { clerkClient, getAuth } from "@clerk/express";
import { Router, type IRouter, type Request } from "express";
import { PARISHES } from "../lib/parishes-data.js";
import { resolveOperatorAuthority } from "../lib/operator-authority.js";
import { SUPPORTED_COUNTRIES } from "../lib/risk-intelligence.js";

const router: IRouter = Router();
const ROLES = new Set([
  "national_coordinator",
  "parish_manager",
  "field_officer",
  "system_admin",
  "private_sector_partner",
]);
const PARISH_ROLES = new Set(["parish_manager", "field_officer"]);
const COUNTRY_BY_CODE = new Map(SUPPORTED_COUNTRIES.map((country) => [country.code, country]));

type InvitationMetadata = {
  rvpInvitation?: boolean;
  rvpOrganizationId?: string;
  rvpOrganizationName?: string;
  rvpRole?: string;
  rvpParishId?: string;
  rvpCountryCode?: string;
  rvpCountryName?: string;
};

function text(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function invitationRedirectUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configuredOrigin = env.RVP_APP_ORIGIN?.trim()
    || (
      env.NODE_ENV === "development"
      && env.REPLIT_DEV_DOMAIN
        ? `https://${env.REPLIT_DEV_DOMAIN}`
        : ""
    );
  if (!configuredOrigin) {
    throw new Error("RVP_APP_ORIGIN is required to send invitations");
  }
  const origin = new URL(configuredOrigin);
  if (origin.protocol !== "https:" || origin.username || origin.password) {
    throw new Error("RVP_APP_ORIGIN must be a trusted HTTPS origin");
  }
  return new URL("/sign-up", origin.origin).toString();
}

function profileFromUser(user: Awaited<ReturnType<typeof clerkClient.users.getUser>>) {
  const metadata = user.publicMetadata as Record<string, unknown>;
  const privateMetadata = user.privateMetadata as Record<string, unknown>;
  return {
    requestedRole: typeof metadata.rvpRole === "string" ? metadata.rvpRole : null,
    status: typeof privateMetadata.rvpRole === "string" ? "active" : "invited",
    fullName: text(metadata.rvpFullName),
    organization: text(metadata.rvpOrganizationName),
    jobTitle: text(metadata.rvpJobTitle),
    phone: text(metadata.rvpPhone),
    parishId: text(metadata.rvpParishId) || null,
    agency: text(metadata.rvpAgency),
    jurisdiction: text(metadata.rvpJurisdiction),
    station: text(metadata.rvpStation),
    responsibilities: text(metadata.rvpResponsibilities, 500),
    sector: text(metadata.rvpSector),
    capabilities: text(metadata.rvpCapabilities, 500),
  };
}

async function ensureOrganization(
  user: Awaited<ReturnType<typeof clerkClient.users.getUser>>,
  role: string,
) {
  if (role === "system_admin") {
    if (
      user.privateMetadata.rvpOrganizationId === "rvp-caribbean-regional"
      && user.privateMetadata.rvpOrganizationName === "Recovery Velocity Platform Caribbean"
    ) return user;
    return clerkClient.users.updateUserMetadata(user.id, {
      privateMetadata: {
        ...user.privateMetadata,
        rvpOrganizationId: "rvp-caribbean-regional",
        rvpOrganizationName: "Recovery Velocity Platform Caribbean",
        rvpCountryCode: undefined,
        rvpCountryName: undefined,
        rvpParishId: undefined,
      },
    });
  }
  const existingId = text(user.privateMetadata.rvpOrganizationId);
  if (existingId || role !== "national_coordinator") return user;
  return clerkClient.users.updateUserMetadata(user.id, {
    privateMetadata: {
      ...user.privateMetadata,
      rvpOrganizationId: "rvp-jamaica-command",
      rvpOrganizationName: "Recovery Velocity Platform Jamaica",
    },
  });
}

export function onboardingStateFromUser(
  user: Awaited<ReturnType<typeof clerkClient.users.getUser>>,
) {
  const authority = resolveOperatorAuthority(
    user.privateMetadata,
    (parishId) => PARISHES.some((parish) => parish.id === parishId),
  );
  const emailVerified = user.emailAddresses.some((address) =>
    address.id === user.primaryEmailAddressId && address.verification?.status === "verified"
  );
  return { isAuthenticated: true, emailVerified, authority, profile: profileFromUser(user) };
}
async function onboardingState(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return { isAuthenticated: false, emailVerified: false, authority: null, profile: null };
  const user = await clerkClient.users.getUser(userId);
  return onboardingStateFromUser(user);
}

router.get("/onboarding", async (req, res): Promise<void> => {
  res.json(await onboardingState(req));
});

router.post("/onboarding", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in through your invitation to continue" });
    return;
  }
  let user = await clerkClient.users.getUser(userId);
  const primaryEmail = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId);
  if (primaryEmail?.verification?.status !== "verified") {
    res.status(403).json({ error: "Verify your invited email address before onboarding" });
    return;
  }
  const invitation = user.publicMetadata as InvitationMetadata;
  const existingAuthority = resolveOperatorAuthority(
    user.privateMetadata,
    (parishId) => PARISHES.some((parish) => parish.id === parishId),
  );
  const hasValidInvitation = (
    invitation.rvpInvitation !== true
    ? false
    : typeof invitation.rvpRole === "string"
      && ROLES.has(invitation.rvpRole)
      && typeof invitation.rvpOrganizationId === "string"
  );
  if (!existingAuthority && !hasValidInvitation) {
    res.status(403).json({ error: "This account is not linked to a valid RVP organization invitation" });
    return;
  }
  if (existingAuthority) {
    user = await ensureOrganization(user, existingAuthority.role);
  }
  const assignedRole = existingAuthority?.role ?? text(invitation.rvpRole);
  const assignedParishId = existingAuthority?.parishId ?? text(invitation.rvpParishId);
  const organizationId = text(user.privateMetadata.rvpOrganizationId)
    || text(invitation.rvpOrganizationId);
  const organizationName = text(user.privateMetadata.rvpOrganizationName)
    || text(invitation.rvpOrganizationName);
  if (!organizationId) {
    res.status(403).json({ error: "This account is not assigned to an RVP organization" });
    return;
  }
  const assignedCountryCode = text(user.privateMetadata.rvpCountryCode)
    || text(invitation.rvpCountryCode)
    || (assignedParishId ? "JAM" : "");
  if (PARISH_ROLES.has(assignedRole) && assignedCountryCode === "JAM" && !PARISHES.some((parish) => parish.id === assignedParishId)) {
    res.status(400).json({ error: "The invitation is missing a valid parish assignment" });
    return;
  }
  const input = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const fullName = text(input.fullName);
  const jobTitle = text(input.jobTitle);
  const phone = text(input.phone);

  const updatedUser = await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      rvpFullName: fullName,
      rvpJobTitle: jobTitle,
      rvpPhone: phone,
      rvpAgency: text(input.agency),
      rvpJurisdiction: text(input.jurisdiction),
      rvpStation: text(input.station),
      rvpResponsibilities: text(input.responsibilities, 500),
      rvpSector: text(input.sector),
      rvpCapabilities: text(input.capabilities, 500),
    },
    privateMetadata: {
      ...user.privateMetadata,
      rvpRole: assignedRole,
      rvpParishId: assignedParishId || undefined,
      rvpOrganizationId: organizationId,
      rvpOrganizationName: organizationName,
      rvpCountryCode: assignedCountryCode || undefined,
      rvpCountryName: text(user.privateMetadata.rvpCountryName) || text(invitation.rvpCountryName) || undefined,
    },
  });
  res.json(onboardingStateFromUser(updatedUser));
});

router.get("/organization", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(403).json({ error: "Approved organization access is required" });
    return;
  }
  let current = await clerkClient.users.getUser(userId);
  const authority = resolveOperatorAuthority(
    current.privateMetadata,
    (parishId) => PARISHES.some((parish) => parish.id === parishId),
  );
  if (!authority) {
    res.status(403).json({ error: "Approved organization access is required" });
    return;
  }
  current = await ensureOrganization(current, authority.role);
  const organizationId = text(current.privateMetadata.rvpOrganizationId);
  if (!organizationId) {
    res.status(403).json({ error: "Your account is not assigned to an organization" });
    return;
  }
  const page = await clerkClient.users.getUserList({ limit: 100 });
  const members = page.data
    .filter((user) => authority.role === "system_admin" || user.privateMetadata.rvpOrganizationId === organizationId)
    .map((user) => ({
      id: user.id,
      name: text(user.publicMetadata.rvpFullName) || [user.firstName, user.lastName].filter(Boolean).join(" "),
      email: user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ?? "",
      role: user.privateMetadata.rvpRole ?? null,
      parishId: user.privateMetadata.rvpParishId ?? null,
      countryCode: user.privateMetadata.rvpCountryCode ?? null,
    }));
  res.json({
    id: organizationId,
    name: text(current.privateMetadata.rvpOrganizationName) || "RVP Organization",
    canInvite: authority.role === "system_admin" || authority.role === "national_coordinator",
    allowedInviteRoles: authority.role === "system_admin"
      ? Array.from(ROLES)
      : ["parish_manager", "field_officer", "private_sector_partner"],
    countries: authority.role === "system_admin"
      ? SUPPORTED_COUNTRIES.map(({ code, name }) => ({ code, name }))
      : [],
    members,
  });
});

router.post("/organization/invitations", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(403).json({ error: "Invitation authority is required" });
    return;
  }
  let current = await clerkClient.users.getUser(userId);
  const authority = resolveOperatorAuthority(
    current.privateMetadata,
    (parishId) => PARISHES.some((parish) => parish.id === parishId),
  );
  if (!authority || (authority.role !== "system_admin" && authority.role !== "national_coordinator")) {
    res.status(403).json({ error: "Only System Administrators and Incident Commanders can invite members" });
    return;
  }
  current = await ensureOrganization(current, authority.role);
  const input = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const emailAddress = text(input.email).toLowerCase();
  const role = text(input.role);
  const parishId = text(input.parishId);
  const requestedCountryCode = text(input.countryCode).toUpperCase();
  const currentCountryCode = text(current.privateMetadata.rvpCountryCode).toUpperCase()
    || (text(current.privateMetadata.rvpOrganizationId) === "rvp-jamaica-command" ? "JAM" : "");
  const country = authority.role === "system_admin"
    ? COUNTRY_BY_CODE.get(requestedCountryCode)
    : COUNTRY_BY_CODE.get(currentCountryCode);
  const organizationId = authority.role === "system_admin" && country
    ? `rvp-${country.code.toLowerCase()}-command`
    : text(current.privateMetadata.rvpOrganizationId);
  const organizationName = authority.role === "system_admin" && country
    ? `Recovery Velocity Platform ${country.name}`
    : text(current.privateMetadata.rvpOrganizationName) || "Recovery Velocity Platform";
  if (!organizationId || !country || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress) || !ROLES.has(role)) {
    res.status(400).json({ error: "Provide a valid email address and role" });
    return;
  }
  if (authority.role === "national_coordinator" && (role === "national_coordinator" || role === "system_admin")) {
    res.status(403).json({ error: "Incident Commanders may invite operational and partner roles only" });
    return;
  }
  if (PARISH_ROLES.has(role) && country.code === "JAM" && !PARISHES.some((parish) => parish.id === parishId)) {
    res.status(400).json({ error: "Parish-based roles require a valid parish assignment" });
    return;
  }
  const redirectUrl = invitationRedirectUrl();
  const invitation = await clerkClient.invitations.createInvitation({
    emailAddress,
    redirectUrl,
    publicMetadata: {
      rvpInvitation: true,
      rvpOrganizationId: organizationId,
      rvpOrganizationName: organizationName,
      rvpRole: role,
      rvpCountryCode: country.code,
      rvpCountryName: country.name,
      ...(country.code === "JAM" && parishId ? { rvpParishId: parishId } : {}),
    },
    notify: true,
  });
  res.status(201).json({ id: invitation.id, email: invitation.emailAddress, status: invitation.status, role, parishId: parishId || null });
});

export default router;
