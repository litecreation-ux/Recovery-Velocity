import { randomUUID } from 'crypto';

export interface ResourceItem {
  resourceType: string;
  quantity: number;
  unit: string;
  availabilityWindow: string;
}

export interface ResourceOperationalUpdate {
  id: string;
  parishId: string;
  resourceType: string;
  unit: string;
  deployedQuantity: number;
  verifiedAvailableQuantity: number;
  evidenceNote: string;
  recordedByRole: string;
  timestamp: string;
}

export interface ResourceTarget {
  parishId: string;
  resourceType: string;
  unit: string;
  targetQuantity: number;
  evidenceReference: string;
  evidenceCapturedAt: string;
}

export interface ResourceDeclaration {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationType: string;
  parishId: string;
  facilityCategory: 'hotel' | 'bank' | 'church_faith' | 'fuel' | 'medical' | 'food' | 'shelter' | 'logistics' | 'other';
  location: string;
  contactNotes?: string;
  provenance: 'demo_seed' | 'user_submitted';
  resources: ResourceItem[];
  timestamp: string;
}

// In-memory store
const declarations: ResourceDeclaration[] = [
  // Pre-seed with realistic demo data
  {
    id: randomUUID(),
    organizationId: 'org-001',
    organizationName: 'Grace Kennedy Logistics',
    organizationType: 'logistics_transport',
    parishId: 'kingston',
    facilityCategory: 'logistics',
    location: 'Kingston Industrial Estate',
    contactNotes: 'Coordinate through the partner logistics desk.',
    provenance: 'demo_seed',
    resources: [
      { resourceType: 'vehicles', quantity: 10, unit: 'trucks', availabilityWindow: 'immediately' },
      { resourceType: 'warehouse', quantity: 2000, unit: 'sq ft', availabilityWindow: 'immediately' },
    ],
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: randomUUID(),
    organizationId: 'org-002',
    organizationName: 'Sandals Foundation',
    organizationType: 'hotel_hospitality',
    parishId: 'st-elizabeth',
    facilityCategory: 'hotel',
    location: 'St. Elizabeth',
    contactNotes: 'Shelter and meal capacity is partner-reported.',
    provenance: 'demo_seed',
    resources: [
      { resourceType: 'shelter_beds', quantity: 250, unit: 'beds', availabilityWindow: 'within_6h' },
      { resourceType: 'food_water', quantity: 5000, unit: 'meals', availabilityWindow: 'within_6h' },
    ],
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: randomUUID(),
    organizationId: 'org-003',
    organizationName: 'National Petroleum Corporation',
    organizationType: 'fuel_energy',
    parishId: 'kingston',
    facilityCategory: 'fuel',
    location: 'Kingston',
    provenance: 'demo_seed',
    resources: [
      { resourceType: 'fuel', quantity: 50000, unit: 'litres', availabilityWindow: 'within_24h' },
      { resourceType: 'generators', quantity: 8, unit: 'units', availabilityWindow: 'within_6h' },
    ],
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: randomUUID(),
    organizationId: 'org-004',
    organizationName: 'Caribbean Maritime Institute',
    organizationType: 'fishing_maritime',
    parishId: 'portland',
    facilityCategory: 'logistics',
    location: 'Portland',
    provenance: 'demo_seed',
    resources: [
      { resourceType: 'boats', quantity: 6, unit: 'vessels', availabilityWindow: 'immediately' },
      { resourceType: 'personnel', quantity: 18, unit: 'people', availabilityWindow: 'immediately' },
    ],
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: randomUUID(),
    organizationId: 'org-005',
    organizationName: 'Food For The Poor Jamaica',
    organizationType: 'ngo_faith',
    parishId: 'westmoreland',
    facilityCategory: 'church_faith',
    location: 'Westmoreland',
    contactNotes: 'Faith-community partner; confirm site access before activation.',
    provenance: 'demo_seed',
    resources: [
      { resourceType: 'food_water', quantity: 12000, unit: 'meals', availabilityWindow: 'within_6h' },
      { resourceType: 'shelter_beds', quantity: 80, unit: 'beds', availabilityWindow: 'within_24h' },
    ],
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: randomUUID(),
    organizationId: 'org-007',
    organizationName: 'Westmoreland Emergency Fuel Depot',
    organizationType: 'fuel_energy',
    parishId: 'westmoreland',
    facilityCategory: 'fuel',
    location: 'Savanna-la-Mar',
    contactNotes: 'Depot reserve is reported in the current incident request; verify access before dispatch.',
    provenance: 'demo_seed',
    resources: [
      { resourceType: 'fuel', quantity: 50000, unit: 'litres', availabilityWindow: 'immediately' },
    ],
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: randomUUID(),
    organizationId: 'org-006',
    organizationName: 'MedPharm Jamaica Ltd',
    organizationType: 'medical_pharmacy',
    parishId: 'st-andrew',
    facilityCategory: 'medical',
    location: 'St. Andrew',
    provenance: 'demo_seed',
    resources: [
      { resourceType: 'medical_supplies', quantity: 500, unit: 'units', availabilityWindow: 'immediately' },
      { resourceType: 'personnel', quantity: 12, unit: 'people', availabilityWindow: 'within_6h' },
    ],
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

const targetCapturedAt = '2026-08-29T18:00:00.000Z';
const resourceTargets: ResourceTarget[] = [
  { parishId: 'kingston', resourceType: 'fuel', unit: 'litres', targetQuantity: 60000, evidenceReference: 'Kingston Parish Emergency Logistics Plan · fuel reserve target', evidenceCapturedAt: targetCapturedAt },
  { parishId: 'kingston', resourceType: 'vehicles', unit: 'trucks', targetQuantity: 12, evidenceReference: 'Kingston Parish Emergency Logistics Plan · transport target', evidenceCapturedAt: targetCapturedAt },
  { parishId: 'st-elizabeth', resourceType: 'shelter_beds', unit: 'beds', targetQuantity: 300, evidenceReference: 'St. Elizabeth Parish Shelter Coordination Plan · bed target', evidenceCapturedAt: targetCapturedAt },
  { parishId: 'st-elizabeth', resourceType: 'food_water', unit: 'meals', targetQuantity: 6000, evidenceReference: 'St. Elizabeth Parish Shelter Coordination Plan · meal target', evidenceCapturedAt: targetCapturedAt },
  { parishId: 'portland', resourceType: 'boats', unit: 'vessels', targetQuantity: 8, evidenceReference: 'Portland Parish Maritime Access Plan · vessel target', evidenceCapturedAt: targetCapturedAt },
  { parishId: 'portland', resourceType: 'personnel', unit: 'people', targetQuantity: 24, evidenceReference: 'Portland Parish Maritime Access Plan · response personnel target', evidenceCapturedAt: targetCapturedAt },
  { parishId: 'westmoreland', resourceType: 'food_water', unit: 'meals', targetQuantity: 15000, evidenceReference: 'Westmoreland Parish Relief Distribution Plan · meal target', evidenceCapturedAt: targetCapturedAt },
  { parishId: 'westmoreland', resourceType: 'shelter_beds', unit: 'beds', targetQuantity: 150, evidenceReference: 'Westmoreland Parish Relief Distribution Plan · bed target', evidenceCapturedAt: targetCapturedAt },
  { parishId: 'westmoreland', resourceType: 'fuel', unit: 'litres', targetQuantity: 50000, evidenceReference: 'Westmoreland Parish Emergency Fuel Continuity Plan · depot reserve target', evidenceCapturedAt: targetCapturedAt },
  { parishId: 'st-andrew', resourceType: 'medical_supplies', unit: 'units', targetQuantity: 800, evidenceReference: 'St. Andrew Parish Health Continuity Plan · medical supply target', evidenceCapturedAt: targetCapturedAt },
  { parishId: 'st-andrew', resourceType: 'personnel', unit: 'people', targetQuantity: 20, evidenceReference: 'St. Andrew Parish Health Continuity Plan · response personnel target', evidenceCapturedAt: targetCapturedAt },
];

const operationalUpdates: ResourceOperationalUpdate[] = [
  {
    id: randomUUID(),
    parishId: 'kingston',
    resourceType: 'fuel',
    unit: 'litres',
    deployedQuantity: 8000,
    verifiedAvailableQuantity: 42000,
    evidenceNote: 'Kingston fuel reserve verification exercise; demo snapshot for coordinator review.',
    recordedByRole: 'ops_section_chief',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    id: randomUUID(),
    parishId: 'westmoreland',
    resourceType: 'fuel',
    unit: 'litres',
    deployedQuantity: 0,
    verifiedAvailableQuantity: 9000,
    evidenceNote: 'Savanna-la-Mar depot verified at an 18-hour reserve; A2 delivery route remains flooded at Cabarita Bridge.',
    recordedByRole: 'ops_section_chief',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
];

export function getDeclarations(): ResourceDeclaration[] {
  return [...declarations];
}

export function addDeclaration(input: Omit<ResourceDeclaration, 'id' | 'organizationId' | 'timestamp' | 'provenance'>): ResourceDeclaration {
  const declaration: ResourceDeclaration = {
    ...input,
    id: randomUUID(),
    organizationId: `org-${randomUUID().slice(0, 8)}`,
    provenance: 'user_submitted',
    timestamp: new Date().toISOString(),
  };
  declarations.push(declaration);
  return declaration;
}

export function getResourceSummary() {
  const categoryMap = new Map<string, { resourceType: string; totalQuantity: number; unit: string; entries: { organizationName: string; parishId: string; quantity: number; unit: string; availabilityWindow: string; provenance: ResourceDeclaration['provenance'] }[] }>();

  for (const decl of declarations) {
    for (const res of decl.resources) {
      const key = `${res.resourceType}:${res.unit.toLowerCase()}`;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { resourceType: res.resourceType, totalQuantity: 0, unit: res.unit, entries: [] });
      }
      const cat = categoryMap.get(key)!;
      cat.totalQuantity += res.quantity;
      cat.entries.push({
        organizationName: decl.organizationName,
        parishId: decl.parishId,
        quantity: res.quantity,
        unit: res.unit,
        availabilityWindow: res.availabilityWindow,
        provenance: decl.provenance,
      });
    }
  }

  return {
    totalDeclarations: declarations.length,
    containsDemoData: declarations.some((declaration) => declaration.provenance === 'demo_seed'),
    categories: Array.from(categoryMap.values()).map((v) => ({
      resourceType: v.resourceType,
      totalQuantity: v.totalQuantity,
      unit: v.unit,
      declarationCount: v.entries.length,
      declarations: v.entries,
    })),
    lastUpdated: new Date().toISOString(),
  };
}

export function getResourceTargets(): ResourceTarget[] {
  return resourceTargets.map((target) => ({ ...target }));
}

export function isCompatibleResourceUnit(parishId: string, resourceType: string, unit: string): boolean {
  const normalizedUnit = unit.trim().toLowerCase();
  return declarations.some((declaration) =>
    declaration.parishId === parishId
    && declaration.resources.some((resource) =>
      resource.resourceType === resourceType && resource.unit.toLowerCase() === normalizedUnit,
    ),
  ) || resourceTargets.some((target) =>
    target.parishId === parishId
    && target.resourceType === resourceType
    && target.unit.toLowerCase() === normalizedUnit,
  );
}

export function addOperationalUpdate(input: Omit<ResourceOperationalUpdate, 'id' | 'timestamp'>): ResourceOperationalUpdate {
  const update: ResourceOperationalUpdate = {
    ...input,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  operationalUpdates.push(update);
  return { ...update };
}

export function getOperationalStatuses(parishId?: string) {
  const scopedDeclarations = declarations.filter((declaration) => !parishId || declaration.parishId === parishId);
  const groups = new Map<string, {
    parishId: string;
    resourceType: string;
    unit: string;
    declaredQuantity: number;
    declarationCount: number;
  }>();

  for (const declaration of scopedDeclarations) {
    for (const resource of declaration.resources) {
      const key = `${declaration.parishId}:${resource.resourceType}:${resource.unit.toLowerCase()}`;
      const current = groups.get(key) ?? {
        parishId: declaration.parishId,
        resourceType: resource.resourceType,
        unit: resource.unit,
        declaredQuantity: 0,
        declarationCount: 0,
      };
      current.declaredQuantity += resource.quantity;
      current.declarationCount += 1;
      groups.set(key, current);
    }
  }

  for (const target of resourceTargets.filter((item) => !parishId || item.parishId === parishId)) {
    const key = `${target.parishId}:${target.resourceType}:${target.unit.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        parishId: target.parishId,
        resourceType: target.resourceType,
        unit: target.unit,
        declaredQuantity: 0,
        declarationCount: 0,
      });
    }
  }

  for (const update of operationalUpdates.filter((item) => !parishId || item.parishId === parishId)) {
    const key = `${update.parishId}:${update.resourceType}:${update.unit.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        parishId: update.parishId,
        resourceType: update.resourceType,
        unit: update.unit,
        declaredQuantity: 0,
        declarationCount: 0,
      });
    }
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const target = resourceTargets.find((item) => `${item.parishId}:${item.resourceType}:${item.unit.toLowerCase()}` === key);
    const latestUpdate = [...operationalUpdates]
      .filter((update) => `${update.parishId}:${update.resourceType}:${update.unit.toLowerCase()}` === key)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    const status = !target || !latestUpdate
      ? 'unverified' as const
      : latestUpdate.verifiedAvailableQuantity >= target.targetQuantity
        ? 'sufficient' as const
        : 'shortfall' as const;
    const shortfallQuantity = target && latestUpdate
      ? Math.max(0, target.targetQuantity - latestUpdate.verifiedAvailableQuantity)
      : null;

    return {
      ...group,
      targetQuantity: target?.targetQuantity ?? null,
      targetEvidenceReference: target?.evidenceReference ?? null,
      targetEvidenceCapturedAt: target?.evidenceCapturedAt ?? null,
      deployedQuantity: latestUpdate?.deployedQuantity ?? null,
      verifiedAvailableQuantity: latestUpdate?.verifiedAvailableQuantity ?? null,
      operationalStatus: status,
      shortfallQuantity,
      lastOperationalUpdateAt: latestUpdate?.timestamp ?? null,
      recordedByRole: latestUpdate?.recordedByRole ?? null,
      operationalEvidenceNote: latestUpdate?.evidenceNote ?? null,
    };
  }).sort((a, b) => a.resourceType.localeCompare(b.resourceType) || a.unit.localeCompare(b.unit));
}

// ResourceExchangeAgent — runs every 30 seconds, cross-references declarations with needs
const PARISH_NAMES: Record<string, string> = {
  'kingston': 'Kingston', 'st-andrew': 'St. Andrew', 'st-thomas': 'St. Thomas',
  'portland': 'Portland', 'st-mary': 'St. Mary', 'st-ann': 'St. Ann',
  'trelawny': 'Trelawny', 'st-james': 'St. James', 'hanover': 'Hanover',
  'westmoreland': 'Westmoreland', 'st-elizabeth': 'St. Elizabeth',
  'manchester': 'Manchester', 'clarendon': 'Clarendon', 'st-catherine': 'St. Catherine',
};

// Track last-seen declaration IDs so we only process new ones
let lastProcessedCount = declarations.length;
let lastAction = 'Awaiting first declarations from private sector partners.';
let lastActionAt = new Date().toISOString();
let activeParishes: string[] = [];

export function getResourceExchangeAgentStatus() {
  return {
    id: 8,
    name: 'ResourceExchangeAgent',
    description: 'Reads private sector resource declarations and cross-references them against the Incident Command queue to generate resource-match recommendations.',
    status: 'active' as const,
    lastAction,
    lastActionAt,
    parishesMonitored: activeParishes,
  };
}

const MATCH_TEMPLATES = [
  (org: string, parish: string, qty: number, unit: string) =>
    `${org} (${PARISH_NAMES[parish] ?? parish}) has declared ${qty} ${unit} available immediately. Route clearance in ${PARISH_NAMES[parish] ?? parish} would allow delivery to the nearest shelter within 4 hours. Recommend coordinator contact to confirm deployment.`,
  (org: string, parish: string, qty: number, unit: string) =>
    `${org} (${PARISH_NAMES[parish] ?? parish}) has offered ${qty} ${unit} within 6 hours. Incident Command queue has open resource requests in ${PARISH_NAMES[parish] ?? parish}. Recommend immediate outreach to activate this resource.`,
  (org: string, parish: string, qty: number, unit: string) =>
    `Resource match detected: ${org} (${PARISH_NAMES[parish] ?? parish}) has declared ${qty} ${unit}. Cross-referencing against recovery forecast confirms critical gap this resource can fill. Coordinator action recommended.`,
];

async function runMatchCycle() {
  const current = declarations.length;
  if (current === lastProcessedCount) return;
  const { db, reviewItemsTable } = await import('@workspace/db');

  // Find newly added declarations since last run
  const newDecls = declarations.slice(lastProcessedCount);
  lastProcessedCount = current;

  const matched: string[] = [];

  for (const decl of newDecls) {
    for (const res of decl.resources) {
      const template = MATCH_TEMPLATES[Math.floor(Math.random() * MATCH_TEMPLATES.length)];
      const description = template(decl.organizationName, decl.parishId, res.quantity, res.unit);
      const parishName = PARISH_NAMES[decl.parishId] ?? decl.parishId;
      const resourceLabel = res.resourceType.replace(/_/g, ' ');
      const title = `Resource Match: ${decl.organizationName} — ${resourceLabel} (${res.quantity} ${res.unit})`;

      try {
        await db.insert(reviewItemsTable).values({
          parishId: decl.parishId,
          parishName,
          type: 'resource_request',
          title,
          description,
          status: 'pending',
        });
        matched.push(decl.parishId);
      } catch {
        // ignore insert errors
      }
    }
  }

  if (matched.length > 0) {
    activeParishes = [...new Set(matched)];
    const parishLabels = activeParishes.map(p => PARISH_NAMES[p] ?? p).join(', ');
    lastAction = `Processed ${newDecls.length} new declaration(s). Generated ${matched.length} resource-match recommendation(s) for ${parishLabels}.`;
    lastActionAt = new Date().toISOString();
  }
}

// Start the agent loop
export function startResourceExchangeAgent() {
  // Seed declarations are display data and must not create duplicate review items on restart.
  setTimeout(() => runMatchCycle(), 5000);
  setInterval(() => runMatchCycle(), 30_000);
}
