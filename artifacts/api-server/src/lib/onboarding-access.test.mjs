import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findAcceptedInvitationMetadata,
  invitationRedirectUrl,
  onboardingStateFromUser,
  resolveInvitationAssignment,
  resolveInvitationTarget,
} from '../routes/onboarding.ts';

function clerkUser({ publicMetadata = {}, privateMetadata = {}, verified = true } = {}) {
  return {
    id: 'user_fixture',
    publicMetadata,
    privateMetadata,
    primaryEmailAddressId: 'email_fixture',
    emailAddresses: [{
      id: 'email_fixture',
      emailAddress: 'fixture@example.org',
      verification: { status: verified ? 'verified' : 'unverified' },
    }],
  };
}

test('Clerk invitations redirect to the registered web artifact sign-up route', () => {
  assert.equal(
    invitationRedirectUrl({
      RVP_APP_ORIGIN: 'https://recovery.example.org/obsolete-app-path',
    }),
    'https://recovery.example.org/sign-up',
  );
});

test('successful invited onboarding returns active Kingston authority', () => {
  const completedInvite = clerkUser({
    publicMetadata: {
      rvpInvitation: true,
      rvpRole: 'parish_manager',
      rvpParishId: 'kingston',
      rvpOrganizationName: 'Kingston Emergency Operations',
    },
    privateMetadata: {
      rvpRole: 'parish_manager',
      rvpParishId: 'kingston',
      rvpOrganizationId: 'kingston-eoc',
    },
  });

  const state = onboardingStateFromUser(completedInvite);
  assert.deepEqual(state.authority, { role: 'parish_manager', parishId: 'kingston' });
  assert.equal(state.profile.status, 'active');
});

test('a verified but uninvited Clerk user has no operational authority', () => {
  const state = onboardingStateFromUser(clerkUser());
  assert.equal(state.emailVerified, true);
  assert.equal(state.authority, null);
  assert.equal(state.profile.status, 'invited');
});

test('accepted Clerk invitation metadata can be recovered by exact verified email', () => {
  const metadata = findAcceptedInvitationMetadata([{
    emailAddress: 'fixture@example.org',
    status: 'accepted',
    publicMetadata: {
      rvpInvitation: true,
      rvpRole: 'national_coordinator',
      rvpCountryCode: 'JAM',
      rvpCountryName: 'Jamaica',
      rvpOrganizationId: 'rvp-jam-command',
      rvpOrganizationName: 'Recovery Velocity Platform Jamaica',
    },
  }], ' FIXTURE@example.org ');
  assert.equal(metadata.rvpRole, 'national_coordinator');
  assert.equal(metadata.rvpOrganizationId, 'rvp-jam-command');
});

test('invitation recovery rejects pending, mismatched, and invalid assignments', () => {
  const validMetadata = {
    rvpInvitation: true,
    rvpRole: 'national_coordinator',
    rvpCountryCode: 'JAM',
    rvpCountryName: 'Jamaica',
    rvpOrganizationId: 'rvp-jam-command',
    rvpOrganizationName: 'Recovery Velocity Platform Jamaica',
  };
  assert.equal(findAcceptedInvitationMetadata([{
    emailAddress: 'fixture@example.org',
    status: 'pending',
    publicMetadata: validMetadata,
  }], 'fixture@example.org'), null);
  assert.equal(findAcceptedInvitationMetadata([{
    emailAddress: 'someone-else@example.org',
    status: 'accepted',
    publicMetadata: validMetadata,
  }], 'fixture@example.org'), null);
  assert.equal(findAcceptedInvitationMetadata([{
    emailAddress: 'fixture@example.org',
    status: 'accepted',
    publicMetadata: { ...validMetadata, rvpOrganizationId: 'untrusted-org' },
  }], 'fixture@example.org'), null);
});

test('system-admin invitation assignment requires a supported country and matching organization', () => {
  const assignment = resolveInvitationAssignment({
    rvpInvitation: true,
    rvpRole: 'field_officer',
    rvpCountryCode: 'BRB',
    rvpCountryName: 'Untrusted client value',
    rvpOrganizationId: 'rvp-brb-command',
    rvpOrganizationName: 'Recovery Velocity Platform Barbados',
  });
  assert.deepEqual(assignment, {
    role: 'field_officer',
    parishId: undefined,
    countryCode: 'BRB',
    countryName: 'Barbados',
    organizationId: 'rvp-brb-command',
    organizationName: 'Recovery Velocity Platform Barbados',
  });
  assert.equal(resolveInvitationAssignment({
    rvpInvitation: true,
    rvpRole: 'field_officer',
    rvpCountryCode: 'USA',
    rvpOrganizationId: 'rvp-usa-command',
    rvpOrganizationName: 'Recovery Velocity Platform USA',
  }), null);
  assert.equal(resolveInvitationAssignment({
    rvpInvitation: true,
    rvpRole: 'field_officer',
    rvpCountryCode: 'BRB',
    rvpOrganizationId: 'rvp-jam-command',
    rvpOrganizationName: 'Recovery Velocity Platform Jamaica',
  }), null);
});

test('parish assignment is Jamaica-only and cannot leak into another country', () => {
  assert.equal(resolveInvitationAssignment({
    rvpInvitation: true,
    rvpRole: 'field_officer',
    rvpCountryCode: 'JAM',
    rvpOrganizationId: 'rvp-jam-command',
    rvpOrganizationName: 'Recovery Velocity Platform Jamaica',
  }), null);

  const barbados = resolveInvitationAssignment({
    rvpInvitation: true,
    rvpRole: 'field_officer',
    rvpParishId: 'kingston',
    rvpCountryCode: 'BRB',
    rvpOrganizationId: 'rvp-brb-command',
    rvpOrganizationName: 'Recovery Velocity Platform Barbados',
  });
  assert.equal(barbados.parishId, undefined);
});

test('system administrators must select a supported invitation country', () => {
  assert.equal(resolveInvitationTarget('system_admin', {}, ''), null);
  assert.equal(resolveInvitationTarget('system_admin', {}, 'USA'), null);
  assert.deepEqual(resolveInvitationTarget('system_admin', {}, 'BRB'), {
    country: {
      code: 'BRB',
      name: 'Barbados',
      region: 'Caribbean',
      latitude: 13.2,
      longitude: -59.5,
      hasOperationalUnits: false,
      hazards: ['Hurricanes', 'Tropical storms', 'Coastal flooding'],
      preparednessScope: 'National indicators and city reference locations are available; local operational coverage is not onboarded.',
    },
    organizationId: 'rvp-brb-command',
    organizationName: 'Recovery Velocity Platform Barbados',
  });
});

test('Incident Commanders remain inside their own country and organization', () => {
  const target = resolveInvitationTarget('national_coordinator', {
    rvpCountryCode: 'JAM',
    rvpOrganizationId: 'rvp-jamaica-command',
    rvpOrganizationName: 'Recovery Velocity Platform Jamaica',
  }, 'BRB');
  assert.equal(target.country.code, 'JAM');
  assert.equal(target.organizationId, 'rvp-jamaica-command');
  assert.equal(target.organizationName, 'Recovery Velocity Platform Jamaica');

  const assignment = resolveInvitationAssignment({
    rvpInvitation: true,
    rvpRole: 'field_officer',
    rvpParishId: 'kingston',
    rvpCountryCode: target.country.code,
    rvpCountryName: target.country.name,
    rvpOrganizationId: target.organizationId,
    rvpOrganizationName: target.organizationName,
  });
  assert.equal(assignment.countryCode, 'JAM');
  assert.equal(assignment.organizationId, 'rvp-jamaica-command');
  assert.equal(assignment.parishId, 'kingston');
});

test('Incident Commanders cannot invite from mismatched country or organization metadata', () => {
  assert.equal(resolveInvitationTarget('national_coordinator', {
    rvpCountryCode: 'BRB',
    rvpOrganizationId: 'rvp-jamaica-command',
    rvpOrganizationName: 'Recovery Velocity Platform Jamaica',
  }, 'BRB'), null);
  assert.equal(resolveInvitationTarget('national_coordinator', {
    rvpCountryCode: 'JAM',
    rvpOrganizationId: 'rvp-jamaica-command',
    rvpOrganizationName: 'Wrong organization',
  }, 'JAM'), null);
});

test('system-admin invitation metadata survives assignment validation unchanged', () => {
  const target = resolveInvitationTarget('system_admin', {}, 'BRB');
  const assignment = resolveInvitationAssignment({
    rvpInvitation: true,
    rvpRole: 'field_officer',
    rvpCountryCode: target.country.code,
    rvpCountryName: target.country.name,
    rvpOrganizationId: target.organizationId,
    rvpOrganizationName: target.organizationName,
  });
  assert.equal(assignment.countryCode, 'BRB');
  assert.equal(assignment.organizationId, 'rvp-brb-command');
  assert.equal(assignment.parishId, undefined);
});

test('previously issued Jamaica invitations retain their legacy organization binding', () => {
  const assignment = resolveInvitationAssignment({
    rvpInvitation: true,
    rvpRole: 'field_officer',
    rvpParishId: 'kingston',
    rvpCountryCode: 'JAM',
    rvpCountryName: 'Jamaica',
    rvpOrganizationId: 'rvp-jam-command',
    rvpOrganizationName: 'Recovery Velocity Platform Jamaica',
  });
  assert.equal(assignment.countryCode, 'JAM');
  assert.equal(assignment.organizationId, 'rvp-jam-command');
  assert.equal(assignment.parishId, 'kingston');
});

test('existing Jamaica coordinators with the legacy organization ID can still invite', () => {
  const target = resolveInvitationTarget('national_coordinator', {
    rvpCountryCode: 'JAM',
    rvpOrganizationId: 'rvp-jam-command',
    rvpOrganizationName: 'Recovery Velocity Platform Jamaica',
  }, 'BRB');
  assert.equal(target.country.code, 'JAM');
  assert.equal(target.organizationId, 'rvp-jam-command');

  const assignment = resolveInvitationAssignment({
    rvpInvitation: true,
    rvpRole: 'field_officer',
    rvpParishId: 'kingston',
    rvpCountryCode: target.country.code,
    rvpCountryName: target.country.name,
    rvpOrganizationId: target.organizationId,
    rvpOrganizationName: target.organizationName,
  });
  assert.equal(assignment.organizationId, 'rvp-jam-command');
});