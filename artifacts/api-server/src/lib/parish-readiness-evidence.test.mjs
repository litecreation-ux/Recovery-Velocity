import assert from 'node:assert/strict';
import test from 'node:test';
import { getParishReadinessEvidence } from './parishes-data.ts';

test('exposes Kingston factor inputs with freshness and data-layer provenance', () => {
  const evidence = getParishReadinessEvidence('kingston');
  assert.ok(evidence);

  const economic = evidence.factors.find((factor) => factor.name === 'Economic capacity');
  assert.equal(economic?.score, 16);
  assert.deepEqual(
    economic?.metrics.map(({ label, value }) => ({ label, value })),
    [
      { label: 'GDP per capita index', value: 42 },
      { label: 'Business continuity planning coverage', value: 28 },
      { label: 'Access to emergency credit facilities', value: 31 },
      { label: 'Private-sector disaster insurance penetration', value: 18 },
    ],
  );
  assert.ok(economic?.metrics.every((metric) => metric.lastUpdated));
  assert.ok(economic?.metrics.every((metric) => metric.dataLayers.includes('L6 Economic Resilience')));

  const health = evidence.factors.find((factor) => factor.name === 'Population health capacity');
  assert.equal(health?.score, 84);
  assert.ok(health?.metrics.some((metric) => metric.label === 'Hospital bed density'));
  assert.ok(health?.metrics.some((metric) => metric.dataLayers.includes('L3 Community Vulnerability')));
  assert.ok(health?.metrics.some((metric) => metric.dataLayers.includes('L5 Critical Services')));
  assert.equal(health?.metrics.find((metric) => metric.label === 'Communication difficulty')?.evidenceType, 'verified_observation');
  assert.equal(health?.metrics.some((metric) => metric.label === 'Disability-adjusted vulnerability index'), false);
});

test('adds only verified local observations while leaving missing non-Kingston inputs unavailable', () => {
  const evidence = getParishReadinessEvidence('st-elizabeth');
  assert.ok(evidence);
  assert.ok(evidence.factors.length > 0);
  assert.ok(evidence.factors.every((factor) => factor.score === null));
  const metrics = evidence.factors.flatMap((factor) => factor.metrics);
  const verified = metrics.filter((metric) => metric.evidenceType === 'verified_observation');
  const unavailable = metrics.filter((metric) => metric.evidenceType === 'unavailable');
  assert.deepEqual(
    verified.map((metric) => metric.label).sort(),
    ['Communication difficulty', 'Usually resident population'],
  );
  assert.ok(verified.every((metric) => (
    metric.value !== null
    && metric.sourceId
    && metric.sourceUrl
    && metric.sourceRecordId?.startsWith('STATIN-PHC2011-')
    && metric.observationDate
    && metric.freshnessState === 'historical'
    && metric.lastCheckedAt
    && metric.refreshExpectation
  )));
  assert.ok(unavailable.every((metric) => (
    metric.value === null
    && metric.sourceStatus === 'unavailable'
    && metric.evidenceType === 'unavailable'
  )));
  assert.match(evidence.scopeNote, /remain planning proxies/i);
  assert.equal(evidence.sources.length, 2);
  assert.ok(evidence.sources.every((source) => (
    source.permissionNote
    && source.refreshExpectation
    && source.contentSha256?.length === 64
    && source.sourceUrl.includes('/Census/PopCensus/')
  )));
  assert.equal(verified.find((metric) => metric.label === 'Usually resident population')?.value, 150205);
  assert.equal(verified.find((metric) => metric.label === 'Communication difficulty')?.value, 2.1);
});

test('does not mislabel national observations as verified parish evidence', () => {
  const evidence = getParishReadinessEvidence('kingston');
  assert.ok(evidence);
  const metrics = evidence.factors.flatMap((factor) => factor.metrics);
  assert.equal(metrics.find((metric) => metric.label === 'GDP per capita index')?.evidenceType, 'planning_proxy');
  assert.equal(metrics.find((metric) => metric.label === 'Individuals using the internet')?.evidenceType, 'planning_proxy');
  assert.equal(metrics.find((metric) => metric.label === 'GDP per capita index')?.freshnessState, 'stale');
  assert.equal(metrics.find((metric) => metric.label === 'Individuals using the internet')?.freshnessState, 'stale');
  assert.ok(metrics.filter((metric) => metric.evidenceType === 'planning_proxy' && metric.freshnessState === 'stale').every((metric) => metric.sourceStatus === 'stale'));
});

test('keeps an overdue verified snapshot visible as stale', () => {
  const evidence = getParishReadinessEvidence('st-elizabeth', new Date('2027-01-01T00:00:00Z'));
  assert.ok(evidence);
  assert.ok(evidence.sources.every((source) => source.sourceStatus === 'stale'));
  const verified = evidence.factors.flatMap((factor) => factor.metrics).filter((metric) => metric.evidenceType === 'verified_observation');
  assert.ok(verified.every((metric) => metric.value !== null && metric.freshnessState === 'stale' && metric.sourceStatus === 'stale'));
  assert.ok(verified.every((metric) => metric.unavailableDetail?.includes('Refresh overdue')));
});

test('calculates peer context from the current Jamaica parish readiness data', () => {
  const evidence = getParishReadinessEvidence('kingston');
  assert.ok(evidence);
  assert.deepEqual(evidence.peerComparison, {
    rank: 2,
    totalParishes: 14,
    nationalAverage: 62,
    lowestParish: 'St. Thomas',
    lowestScore: 44,
  });
});

test('separates scenario projection from the 90-day planning trend', () => {
  const evidence = getParishReadinessEvidence('kingston');
  assert.ok(evidence);
  assert.ok(evidence.trend.slice(0, -1).every((point) => point.kind === 'planning_proxy'));
  assert.equal(evidence.trend.at(-1)?.kind, 'scenario_projection');
  assert.match(evidence.trendSummary, /not an observed historical score/i);
});