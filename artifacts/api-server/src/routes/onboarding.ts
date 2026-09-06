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

type InvitationRecord = {
  emailAddress?: string;
  status?: string;
  publicMetadata?: unknown;
};

function text(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function countryOrganization(country: { code: string; name: string }) {
  return {
    organizationId: country.code === "JAM"
      ? "rvp-jamaica-command"
      : `rvp-${country.code.toLowerCase()}-command`,
    organizationName: `Recovery Velocity Platform ${country.name}`,
  };
}

function matchesCountryOrganization(
  country: { code: string; name: string },
  organizationId: string,
  organizationName: string,
) {
  const canonical = countryOrganization(country);
  const validIds = country.code === "JAM"
    ? new Set([canonical.organizationId, "rvp-jam-command"])
    : new Set([canonical.organizationId]);
  return validIds.has(organizationId) && organizationName === canonical.organizationName;
}

export function resolveInvitationAssignment(invitation: InvitationMetadata) {
  const role = text(invitation.rvpRole);
  const countryCode = text(invitation.rvpCountryCode).toUpperCase();
  const country = COUNTRY_BY_CODE.get(countryCode);
  if (
    invitation.rvpInvitation !== true
    || !ROLES.has(role)
    || !country
  ) return null;

  const organization = countryOrganization(country);
  if (
    !matchesCountryOrganization(
      country,
      text(invitation.rvpOrganizationId),
      text(invitation.rvpOrganizationName),
    )
  ) return null;

  const requestedParishId = text(invitation.rvpParishId);
  const parishId = country.code === "JAM" ? requestedParishId : "";
  if (
    PARISH_ROLES.has(role)
    && country.code === "JAM"
    && !PARISHES.some((parish) => parish.id === parishId)
  ) return null;

  return {
    role,
    parishId: parishId || undefined,
    countryCode: country.code,
    countryName: country.name,
    organizationId: text(invitation.rvpOrganizationId),
    organizationName: organization.organizationName,
  };
}

export function findAcceptedInvitationMetadata(
  invitations: InvitationRecord[],
  emailAddress: string,
): InvitationMetadata | null {
  const normalizedEmail = emailAddress.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const invitation = invitations.find((candidate) =>
    candidate.status === "accepted"
    && text(candidate.emailAddress).toLowerCase() === normalizedEmail
  );
  if (!invitation || !invitation.publicMetadata || typeof invitation.publicMetadata !== "object") {
    return null;
  }
  const metadata = invitation.publicMetadata as InvitationMetadata;
  return resolveInvitationAssignment(metadata) ? metadata : null;
}

export function resolveInvitationTarget(
  inviterRole: string,
  inviterMetadata: Record<string, unknown>,
  requestedCountryCode: string,
) {
  const currentCountryCode = text(inviterMetadata.rvpCountryCode).toUpperCase()
    || (text(inviterMetadata.rvpOrganizationId) === "rvp-jamaica-command" ? "JAM" : "");
  const country = COUNTRY_BY_CODE.get(
    inviterRole === "system_admin" ? requestedCountryCode.toUpperCase() : currentCountryCode,
  );
  if (!country) return null;

  if (inviterRole === "system_admin") {
    return { country, ...countryOrganization(country) };
  }

  const canonicalOrganization = countryOrganization(country);
  const organizationId = text(inviterMetadata.rvpOrganizationId);
  const organizationName = text(inviterMetadata.rvpOrganizationName);
  if (!matchesCountryOrganization(country, organizationId, organizationName)) return null;
  return {
    country,
    organizationId,
    organizationName,
  };
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

async function ensureAcceptedInvitationMetadata(
  user: Awaited<ReturnType<typeof clerkClient.users.getUser>>,
) {
  if (
    resolveInvitationAssignment(user.publicMetadata as InvitationMetadata)
    || resolveOperatorAuthority(
      user.privateMetadata,
      (parishId) => PARISHES.some((parish) => parish.id === parishId),
    )
  ) return user;

  const primaryEmail = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId);
  if (!primaryEmail || primaryEmail.verification?.status !== "verified") return user;
  const invitationList = await clerkClient.invitations.getInvitationList({ limit: 100 });
  const invitations = Array.isArray(invitationList)
    ? invitationList
    : (invitationList as { data?: InvitationRecord[] }).data ?? [];
  const metadata = findAcceptedInvitationMetadata(invitations, primaryEmail.emailAddress);
  if (!metadata) return user;

  return clerkClient.users.updateUserMetadata(user.id, {
    publicMetadata: {
      ...user.publicMetadata,
      ...metadata,
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
  const user = await ensureAcceptedInvitationMetadata(await clerkClient.users.getUser(userId));
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
  let user = await ensureAcceptedInvitationMetadata(await clerkClient.users.getUser(userId));
  const primaryEmail = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId);
  if (primaryEmail?.verification?.status !== "verified") {
    res.status(403).json({ error: "Verify your invited email address before onboarding" });
    return;
  }
  const invitation = user.publicMetadata as InvitationMetadata;
  const invitationAssignment = resolveInvitationAssignment(invitation);
  const existingAuthority = resolveOperatorAuthority(
    user.privateMetadata,
    (parishId) => PARISHES.some((parish) => parish.id === parishId),
  );
  const hasValidInvitation = invitationAssignment !== null;
  if (!existingAuthority && !hasValidInvitation) {
    res.status(403).json({ error: "This account is not linked to a valid RVP organization invitation" });
    return;
  }
  if (existingAuthority) {
    user = await ensureOrganization(user, existingAuthority.role);
  }
  const assignedRole = existingAuthority?.role ?? invitationAssignment?.role ?? "";
  const assignedCountryCode = text(user.privateMetadata.rvpCountryCode).toUpperCase()
    || invitationAssignment?.countryCode
    || (existingAuthority?.parishId ? "JAM" : "");
  const assignedParishId = assignedCountryCode === "JAM"
    ? existingAuthority?.parishId ?? invitationAssignment?.parishId ?? ""
    : "";
  const organizationId = text(user.privateMetadata.rvpOrganizationId)
    || invitationAssignment?.organizationId
    || "";
  const organizationName = text(user.privateMetadata.rvpOrganizationName)
    || invitationAssignment?.organizationName
    || "";
  if (!organizationId) {
    res.status(403).json({ error: "This account is not assigned to an RVP organization" });
    return;
  }
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
      rvpCountryName: text(user.privateMetadata.rvpCountryName) || invitationAssignment?.countryName || undefined,
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
  const target = resolveInvitationTarget(authority.role, current.privateMetadata, requestedCountryCode);
  if (!target || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress) || !ROLES.has(role)) {
    res.status(400).json({ error: "Provide a valid email address and role" });
    return;
  }
  const { country, organizationId, organizationName } = target;
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
