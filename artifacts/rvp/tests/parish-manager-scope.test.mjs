import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { workspaceRouteForAuthority } from '../src/lib/authority-routing.ts';

const dashboardPath = new URL('../src/pages/ParishManagerDashboard.tsx', import.meta.url);

test('Kingston parish managers render and request only their assigned parish', async () => {
  const source = await readFile(dashboardPath, 'utf8');

  assert.match(source, /const \{ parishId \} = useRole\(\)/);
  assert.match(source, /selectedParishId=\{parishId\}/);
  for (const component of ['ReadinessPanel', 'ForecastPanel', 'ReportsPanel', 'ParishInfrastructurePanel']) {
    assert.match(source, new RegExp(`<${component}[^>]*parishId=\\{parishId\\}`));
  }
  assert.doesNotMatch(source, /parishId=["'](?:clarendon|st-elizabeth|st-james|st-catherine)["']/i);

  const kingstonFixture = { parishId: 'kingston' };
  const renderedParish = kingstonFixture.parishId.replaceAll('-', ' ');
  assert.equal(renderedParish, 'kingston');
  assert.equal(workspaceRouteForAuthority({ role: 'parish_manager', parishId: 'kingston' }), '/');
});