import { z } from "zod";

export const roleSchema = z.enum([
  "national_coordinator",
  "parish_manager",
  "field_officer",
  "system_admin",
  "private_sector_partner",
]);

export type Role = z.infer<typeof roleSchema>;

export const onboardingAuthoritySchema = z.object({
  role: roleSchema.nullable(),
  parishId: z.string().nullable().optional().transform((parishId) => parishId ?? null),
  countryCode: z.string().nullable().optional().transform((countryCode) => countryCode ?? null),
});

export type OnboardingAuthority = z.infer<typeof onboardingAuthoritySchema>;

export const onboardingStatusSchema = z.enum(["invited", "active"]).nullable();

export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

export const onboardingProfileSchema = z.object({
  requestedRole: roleSchema.nullable(),
  status: onboardingStatusSchema,
  fullName: z.string().nullable(),
  organization: z.string().nullable(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  parishId: z.string().nullable(),
  agency: z.string().nullable(),
  jurisdiction: z.string().nullable(),
  station: z.string().nullable(),
  responsibilities: z.string().nullable(),
  sector: z.string().nullable(),
  capabilities: z.string().nullable(),
});

export type OnboardingProfile = z.infer<typeof onboardingProfileSchema>;

export const onboardingResponseSchema = z.object({
  isAuthenticated: z.boolean(),
  emailVerified: z.boolean(),
  authority: onboardingAuthoritySchema.nullable(),
  profile: onboardingProfileSchema.nullable(),
});

export type OnboardingResponse = z.infer<typeof onboardingResponseSchema>;

export const onboardingQueryKey = ["onboarding"] as const;
export const onboardingStaleTime = 5 * 60 * 1000;

export function parseOnboardingResponse(value: unknown): OnboardingResponse {
  return onboardingResponseSchema.parse(value);
}

export async function fetchOnboarding(): Promise<OnboardingResponse> {
  const response = await fetch("/api/onboarding", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load onboarding status");
  }

  return parseOnboardingResponse(await response.json());
}

export function onboardingQueryOptions() {
  return {
    queryKey: onboardingQueryKey,
    queryFn: fetchOnboarding,
    staleTime: onboardingStaleTime,
    retry: false,
  };
}