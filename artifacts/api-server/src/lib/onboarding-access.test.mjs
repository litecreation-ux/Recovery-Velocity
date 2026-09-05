import assert from 'node:assert/strict';
import test from 'node:test';
import {
  invitationRedirectUrl,
  onboardingStateFromUser,
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