import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { useQuery } from '@tanstack/react-query';
import {
  onboardingQueryOptions,
  type OnboardingResponse,
  type Role,
} from '@/lib/onboarding-contract';

export type { Role } from '@/lib/onboarding-contract';

export const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'national_coordinator', label: 'Incident Commander' },
  { value: 'parish_manager', label: 'Ops Section Chief' },
  { value: 'field_officer', label: 'Field Unit Leader' },
  { value: 'system_admin', label: 'System Admin' },
  { value: 'private_sector_partner', label: 'Unified Command Partner' },
];

interface RoleContextValue {
  role: Role | null;
  parishId: string | null;
  isAuthorityLoading: boolean;
  onboardingData: OnboardingResponse | undefined;
  setRole: (role: Role) => void;
  refetchAuthority: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [role, setRoleState] = useState<Role | null>(null);
  const [parishId, setParishId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<OnboardingResponse>({
    ...onboardingQueryOptions(),
    enabled: isLoaded && !!isSignedIn,
  });

  useEffect(() => {
    if (data?.authority) {
      setRoleState(data.authority.role);
      setParishId(data.authority.parishId);
    } else {
      setRoleState(null);
      setParishId(null);
    }
  }, [data, isSignedIn]);

  const setRole = (nextRole: Role) => {
    console.warn("Role switching is disabled for authenticated users.");
  };

  const isAuthorityLoading = !isLoaded || (isSignedIn && isLoading);

  return (
    <RoleContext.Provider value={{
      role,
      parishId,
      isAuthorityLoading,
      onboardingData: data,
      setRole,
      refetchAuthority: () => refetch()
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}