import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';
import {
  addDeclaration,
  addOperationalUpdate,
  getDeclarations,
  getOperationalStatuses,
  getResourceTargets,
} from './resource-store.ts';
import { createOperationalResourceRouter } from '../routes/exchange.ts';

const validDeclaration = (parishId, resourceType, unit, quantity = 10) => ({
  organizationName: `Integrity fixture ${parishId} ${unit}`,
  organizationType: 'test_operator',
  parishId,
  facilityCategory: 'logistics',
  location: parishId,
  resources: [{
    resourceType,
    quantity,
    unit,
    availabilityWindow: 'immediately',
  }],
});

async function withOperationalApp(authority, callback) {
  const app = express();
  app.use(express.json());
  app.use('/api', createOperationalResourceRouter(async () => authority));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const { port } = server.address();
    return await callback(`http://127.0.0.1:${port}/api/resources/operational`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const operationalBody = (overrides = {}) => ({
  parishId: 'kingston',
  resourceType: 'fuel',
  unit: 'litres',
  deployedQuantity: 5,
  verifiedAvailableQuantity: 50,
  evidenceNote: 'Field count verified by operator',
  ...overrides,
});

test('rejects forged headers and private-sector partner sessions with 403', async () => {
  await withOperationalApp(null, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rvp-role': 'national_coordinator',
        'x-rvp-parish-id': 'kingston',
      },
      body: JSON.stringify(operationalBody()),
    });
    assert.equal(response.status, 403);
  });

  await withOperationalApp({ role: 'private_sector_partner' }, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(operationalBody()),
    });
    assert.equal(response.status, 403);
  });
});

test('enforces parish-manager scope and allows an authorized operator to write', async () => {
  await withOperationalApp({ role: 'parish_manager', parishId: 'st-elizabeth' }, async (url) => {
    const outOfScope = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(operationalBody({ parishId: 'kingston' })),
    });
    assert.equal(outOfScope.status, 403);
  });

  await withOperationalApp({ role: 'parish_manager', parishId: 'st-elizabeth' }, async (url) => {
    const inScope = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(operationalBody({
        parishId: 'st-elizabeth',
        resourceType: 'shelter_beds',
        unit: 'beds',
        deployedQuantity: 25,
        verifiedAvailableQuantity: 325,
      })),
    });
    assert.equal(inScope.status, 201);
    assert.equal((await inScope.json()).operationalStatus, 'sufficient');
  });
});

test('rejects an operational snapshot with an unknown or incompatible unit', async () => {
  await withOperationalApp({ role: 'national_coordinator' }, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(operationalBody({ unit: 'gallons' })),
    });
    assert.equal(response.status, 400);
  });
});

test('keeps partner declarations unchanged when an operational snapshot is recorded', () => {
  const before = getDeclarations();
  addOperationalUpdate({
    parishId: 'kingston',
    resourceType: 'fuel',
    unit: 'litres',
    deployedQuantity: 100,
    verifiedAvailableQuantity: 55_000,
    evidenceNote: 'Tank gauge and dispatch ledger checked',
    recordedByRole: 'national_coordinator',
  });
  assert.deepEqual(getDeclarations(), before);
});

test('groups resources by parish, resource type, and compatible unit', () => {
  const resourceType = 'integrity_fixture_resource';
  addDeclaration(validDeclaration('kingston', resourceType, 'cases', 4));
  addDeclaration(validDeclaration('kingston', resourceType, 'litres', 9));
  addDeclaration(validDeclaration('st-elizabeth', resourceType, 'cases', 7));

  const statuses = getOperationalStatuses().filter((status) => status.resourceType === resourceType);
  assert.deepEqual(
    statuses
      .map(({ parishId, unit, declaredQuantity }) => ({ parishId, unit, declaredQuantity }))
      .sort((a, b) => a.parishId.localeCompare(b.parishId) || a.unit.localeCompare(b.unit)),
    [
      { parishId: 'kingston', unit: 'cases', declaredQuantity: 4 },
      { parishId: 'kingston', unit: 'litres', declaredQuantity: 9 },
      { parishId: 'st-elizabeth', unit: 'cases', declaredQuantity: 7 },
    ],
  );
});

test('calculates shortfall only against the matching parish, resource type, and unit target', () => {
  const before = getOperationalStatuses('kingston')
    .find((status) => status.resourceType === 'fuel' && status.unit === 'litres');
  assert.equal(before?.targetQuantity, 60_000);

  addOperationalUpdate({
    parishId: 'kingston',
    resourceType: 'fuel',
    unit: 'litres',
    deployedQuantity: 12_000,
    verifiedAvailableQuantity: 45_000,
    evidenceNote: 'Kingston fuel inventory reconciled',
    recordedByRole: 'national_coordinator',
  });

  const kingstonFuel = getOperationalStatuses('kingston')
    .find((status) => status.resourceType === 'fuel' && status.unit === 'litres');
  const stElizabethFuel = getOperationalStatuses('st-elizabeth')
    .find((status) => status.resourceType === 'fuel' && status.unit === 'litres');
  assert.equal(kingstonFuel?.shortfallQuantity, 15_000);
  assert.equal(stElizabethFuel, undefined);
});

test('keeps target evidence timestamps stable when the store is loaded again', async () => {
  const initial = getResourceTargets();
  const restarted = await import(`./resource-store.ts?restart=${Date.now()}`);
  assert.deepEqual(
    restarted.getResourceTargets().map(({ parishId, resourceType, unit, evidenceCapturedAt }) => ({
      parishId,
      resourceType,
      unit,
      evidenceCapturedAt,
    })),
    initial.map(({ parishId, resourceType, unit, evidenceCapturedAt }) => ({
      parishId,
      resourceType,
      unit,
      evidenceCapturedAt,
    })),
  );
});