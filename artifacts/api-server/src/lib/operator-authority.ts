export const OPERATOR_ROLES = new Set([
  'national_coordinator',
  'parish_manager',
  'field_officer',
  'system_admin',
]);

const APP_ROLES = new Set([
  ...OPERATOR_ROLES,
  'private_sector_partner',
]);

export type OperatorAuthority = {
  role: string;
  parishId?: string;
  countryCode?: string;
};

const CARIBBEAN_COUNTRY_CODES = new Set([
  'JAM', 'BHS', 'BRB', 'BLZ', 'DOM', 'HTI', 'ATG', 'DMA', 'GRD', 'LCA', 'VCT', 'TTO',
]);

export function resolveOperatorAuthority(
  metadata: Record<string, unknown>,
  isValidParish: (parishId: string) => boolean,
): OperatorAuthority | null {
  const role = metadata.rvpRole;
  const parishId = metadata.rvpParishId;
  const countryCode = typeof metadata.rvpCountryCode === 'string'
    ? metadata.rvpCountryCode.toUpperCase()
    : undefined;
  if (typeof role !== 'string' || !APP_ROLES.has(role)) return null;
  if (role === 'parish_manager' || role === 'field_officer') {
    if (countryCode && !CARIBBEAN_COUNTRY_CODES.has(countryCode)) return null;
    if (!countryCode || countryCode === 'JAM') {
      if (typeof parishId !== 'string' || !isValidParish(parishId)) return null;
      return { role, parishId, ...(countryCode ? { countryCode } : {}) };
    }
    return { role, countryCode };
  }
  return { role, ...(countryCode ? { countryCode } : {}) };
}

export function canRecordForParish(
  authority: OperatorAuthority | null,
  parishId: string,
): boolean {
  if (!authority || !OPERATOR_ROLES.has(authority.role)) return false;
  return (authority.role !== 'parish_manager' && authority.role !== 'field_officer')
    || authority.parishId === parishId;
}