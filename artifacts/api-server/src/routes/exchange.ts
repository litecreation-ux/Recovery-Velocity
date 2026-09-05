import { Router, type IRouter } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import { PARISHES } from '../lib/parishes-data.js';
import {
  canRecordForParish,
  OPERATOR_ROLES,
  resolveOperatorAuthority,
  type OperatorAuthority,
} from '../lib/operator-authority.js';
import {
  addDeclaration,
  addOperationalUpdate,
  getDeclarations,
  getOperationalStatuses,
  getResourceSummary,
  isCompatibleResourceUnit,
} from '../lib/resource-store.js';
import { isDemoAuthorityEnabled } from '../lib/demo-authority.js';

const router: IRouter = Router();

const FACILITY_CATEGORIES = ['hotel', 'bank', 'church_faith', 'fuel', 'medical', 'food', 'shelter', 'logistics', 'other'] as const;
const AVAILABILITY_WINDOWS = ['immediately', 'within_6h', 'within_24h', 'within_48h'] as const;
function demoAuthority(req: Parameters<typeof getAuth>[0]): OperatorAuthority | null {
  if (!isDemoAuthorityEnabled()) return null;
  const role = req.header('x-rvp-demo-role');
  if (role === 'national_coordinator') return { role };
  if (role === 'parish_manager' || role === 'field_officer') {
    return { role, parishId: 'st-elizabeth' };
  }
  return null;
}

async function getOperatorAuthority(req: Parameters<typeof getAuth>[0]): Promise<OperatorAuthority | null> {
  const demo = demoAuthority(req);
  if (demo) return demo;
  const { userId } = getAuth(req);
  if (!userId) return null;
  const user = await clerkClient.users.getUser(userId);
  return resolveOperatorAuthority(
    user.privateMetadata,
    (parishId) => PARISHES.some((parish) => parish.id === parishId),
  );
}

function validateInput(body: unknown): {
  organizationName: string;
  organizationType: string;
  parishId: string;
  facilityCategory: typeof FACILITY_CATEGORIES[number];
  location: string;
  contactNotes?: string;
  resources: { resourceType: string; quantity: number; unit: string; availabilityWindow: typeof AVAILABILITY_WINDOWS[number] }[];
} | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (!b.organizationName || typeof b.organizationName !== 'string') return null;
  if (!b.organizationType || typeof b.organizationType !== 'string') return null;
  if (!b.parishId || typeof b.parishId !== 'string') return null;
  if (!PARISHES.some((parish) => parish.id === b.parishId)) return null;
  if (!b.facilityCategory || typeof b.facilityCategory !== 'string' || !FACILITY_CATEGORIES.includes(b.facilityCategory as typeof FACILITY_CATEGORIES[number])) return null;
  if (!b.location || typeof b.location !== 'string') return null;
  if (b.contactNotes !== undefined && typeof b.contactNotes !== 'string') return null;
  if (!Array.isArray(b.resources) || b.resources.length === 0) return null;
  for (const r of b.resources) {
    if (!r || typeof r !== 'object') return null;
    const item = r as Record<string, unknown>;
    if (!item.resourceType || typeof item.resourceType !== 'string' || !item.resourceType.trim()) return null;
    if (typeof item.quantity !== 'number' || item.quantity <= 0) return null;
    if (!item.unit || typeof item.unit !== 'string' || !item.unit.trim()) return null;
    if (!item.availabilityWindow || typeof item.availabilityWindow !== 'string' || !AVAILABILITY_WINDOWS.includes(item.availabilityWindow as typeof AVAILABILITY_WINDOWS[number])) return null;
  }
  return {
    organizationName: b.organizationName.trim(),
    organizationType: b.organizationType.trim(),
    parishId: b.parishId,
    facilityCategory: b.facilityCategory as typeof FACILITY_CATEGORIES[number],
    location: b.location.trim(),
    ...(typeof b.contactNotes === 'string' && b.contactNotes.trim() ? { contactNotes: b.contactNotes.trim() } : {}),
    resources: b.resources.map((resource) => {
      const item = resource as Record<string, unknown>;
      return {
        resourceType: (item.resourceType as string).trim(),
        quantity: item.quantity as number,
        unit: (item.unit as string).trim(),
        availabilityWindow: item.availabilityWindow as typeof AVAILABILITY_WINDOWS[number],
      };
    }),
  };
}

function validateOperationalInput(body: unknown): {
  parishId: string;
  resourceType: string;
  unit: string;
  deployedQuantity: number;
  verifiedAvailableQuantity: number;
  evidenceNote: string;
} | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (
    typeof b.parishId !== 'string'
    || !PARISHES.some((parish) => parish.id === b.parishId)
    || typeof b.resourceType !== 'string'
    || !b.resourceType.trim()
    || typeof b.unit !== 'string'
    || !b.unit.trim()
    || typeof b.deployedQuantity !== 'number'
    || !Number.isFinite(b.deployedQuantity)
    || b.deployedQuantity < 0
    || typeof b.verifiedAvailableQuantity !== 'number'
    || !Number.isFinite(b.verifiedAvailableQuantity)
    || b.verifiedAvailableQuantity < 0
    || typeof b.evidenceNote !== 'string'
    || b.evidenceNote.trim().length < 3
  ) {
    return null;
  }
  return {
    parishId: b.parishId,
    resourceType: b.resourceType.trim(),
    unit: b.unit.trim(),
    deployedQuantity: b.deployedQuantity,
    verifiedAvailableQuantity: b.verifiedAvailableQuantity,
    evidenceNote: b.evidenceNote.trim(),
  };
}

router.post('/resources/declare', async (req, res): Promise<void> => {
  const data = validateInput(req.body);
  if (!data) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }
  const declaration = addDeclaration(data);
  res.status(201).json(declaration);
});

router.get('/resources/available', (_req, res): void => {
  res.json(getDeclarations());
});

router.get('/resources/summary', (_req, res): void => {
  res.json(getResourceSummary());
});

router.get('/operator-authority', async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.json({ isAuthenticated: false, role: null, parishId: null });
    return;
  }
  const authority = await getOperatorAuthority(req);
  res.json({
    isAuthenticated: true,
    role: authority?.role ?? null,
    parishId: authority?.parishId ?? null,
  });
});

router.get('/resources/operational', (req, res): void => {
  const parishId = typeof req.query.parishId === 'string' ? req.query.parishId : undefined;
  if (parishId && !PARISHES.some((parish) => parish.id === parishId)) {
    res.status(404).json({ error: 'Parish not found' });
    return;
  }
  res.json(getOperationalStatuses(parishId));
});

type OperatorAuthorityResolver = (
  req: Parameters<typeof getAuth>[0],
) => Promise<OperatorAuthority | null>;

export function createOperationalResourceRouter(
  resolveAuthority: OperatorAuthorityResolver = getOperatorAuthority,
): IRouter {
  const operationalRouter: IRouter = Router();

  operationalRouter.post('/resources/operational', async (req, res): Promise<void> => {
    const authority = await resolveAuthority(req);
    if (!authority || !OPERATOR_ROLES.has(authority.role)) {
      res.status(403).json({ error: 'Only authorized operational roles may record resource quantities' });
      return;
    }

    const data = validateOperationalInput(req.body);
    if (!data) {
      res.status(400).json({ error: 'Provide a valid parish, resource, compatible unit, non-negative quantities, and evidence note' });
      return;
    }

    if (!canRecordForParish(authority, data.parishId)) {
      res.status(403).json({ error: 'Parish managers may only record quantities for their assigned parish' });
      return;
    }

    if (!isCompatibleResourceUnit(data.parishId, data.resourceType, data.unit)) {
      res.status(400).json({ error: 'Resource type and unit must match a declared resource or parish target' });
      return;
    }

    addOperationalUpdate({ ...data, recordedByRole: authority.role });
    const status = getOperationalStatuses(data.parishId)
      .find((item) => item.resourceType === data.resourceType && item.unit.toLowerCase() === data.unit.toLowerCase());
    res.status(201).json(status);
  });

  return operationalRouter;
}

router.use(createOperationalResourceRouter());

export default router;
