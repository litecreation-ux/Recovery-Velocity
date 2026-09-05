import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRecordForParish,
  resolveOperatorAuthority,
} from './operator-authority.ts';

const validParish = (parishId) => ['kingston', 'st-elizabeth'].includes(parishId);

test('rejects missing, unknown, and partner operational authority', () => {
  assert.equal(resolveOperatorAuthority({}, validParish), null);
  assert.equal(resolveOperatorAuthority({ rvpRole: 'system_owner' }, validParish), null);
  const partner = resolveOperatorAuthority({ rvpRole: 'private_sector_partner' }, validParish);
  assert.equal(canRecordForParish(partner, 'kingston'), false);
});

test('allows national operators without accepting client parish scope', () => {
  const authority = resolveOperatorAuthority({
    rvpRole: 'national_coordinator',
    rvpParishId: 'st-elizabeth',
  }, validParish);
  assert.deepEqual(authority, { role: 'national_coordinator' });
  assert.equal(canRecordForParish(authority, 'kingston'), true);
});

test('requires and enforces a valid parish-manager assignment', () => {
  assert.equal(resolveOperatorAuthority({ rvpRole: 'parish_manager' }, validParish), null);
  assert.equal(resolveOperatorAuthority({
    rvpRole: 'parish_manager',
    rvpParishId: 'not-a-parish',
  }, validParish), null);

  const authority = resolveOperatorAuthority({
    rvpRole: 'parish_manager',
    rvpParishId: 'st-elizabeth',
  }, validParish);
  assert.deepEqual(authority, { role: 'parish_manager', parishId: 'st-elizabeth' });
  assert.equal(canRecordForParish(authority, 'st-elizabeth'), true);
  assert.equal(canRecordForParish(authority, 'kingston'), false);
});

test('preserves validated parish scope for field officers', () => {
  assert.equal(resolveOperatorAuthority({ rvpRole: 'field_officer' }, validParish), null);
  const authority = resolveOperatorAuthority({
    rvpRole: 'field_officer',
    rvpParishId: 'st-elizabeth',
  }, validParish);
  assert.deepEqual(authority, { role: 'field_officer', parishId: 'st-elizabeth' });
  assert.equal(canRecordForParish(authority, 'st-elizabeth'), true);
  assert.equal(canRecordForParish(authority, 'kingston'), false);
});