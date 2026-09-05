import type { OnboardingAuthority } from "@/lib/onboarding-contract";

export function workspaceRouteForAuthority(authority: OnboardingAuthority | null): string | null {
  if (!authority?.role) return null;
  return authority.role === "field_officer" ? "/field-officer" : "/";
}