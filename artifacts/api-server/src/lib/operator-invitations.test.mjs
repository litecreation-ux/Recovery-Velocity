import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';
import { createOperatorInvitationsRouter } from './operator-invitations-router.ts';

async function withInvitationApp(callback) {
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_RVP_DEMO_AUTH = 'true';
  const auditEntries = [];
  const app = express();
  app.use(express.json());
  app.use('/api', createOperatorInvitationsRouter({
    recordAudit: async (entry) => {
      auditEntries.push(entry);
    },
  }));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const { port } = server.address();
    return await callback({
      url: `http://127.0.0.1:${port}/api/operator-invitations`,
      auditEntries,
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

function commanderHeaders() {
  return {
    'content-type': 'application/json',
    'x-rvp-demo-role': 'national_coordinator',
  };
}

function invitationBody(overrides = {}) {
  return {
    email: 'ops-chief@example.org',
    name: 'Operations Chief',
    role: 'parish_manager',
    roleTitle: 'Ops Section Chief',
    agency: 'National Disaster Risk Management Council',
    icsFunction: 'Operations',
    contactChannel: 'Email',
    parishId: 'clarendon',
    ...overrides,
  };
}

test('allows only the demo Incident Commander to list or create invitations', async () => {
  await withInvitationApp(async ({ url }) => {
    const anonymousList = await fetch(url);
    assert.equal(anonymousList.status, 403);

    const opsCreate = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rvp-demo-role': 'parish_manager',
      },
      body: JSON.stringify(invitationBody()),
    });
    assert.equal(opsCreate.status, 403);

    const commanderList = await fetch(url, {
      headers: { 'x-rvp-demo-role': 'national_coordinator' },
    });
    assert.equal(commanderList.status, 200);
  });
});

test('rejects invalid email addresses and unknown parishes', async () => {
  await withInvitationApp(async ({ url }) => {
    const invalidEmail = await fetch(url, {
      method: 'POST',
      headers: commanderHeaders(),
      body: JSON.stringify(invitationBody({ email: 'not-an-email' })),
    });
    assert.equal(invalidEmail.status, 400);

    const invalidParish = await fetch(url, {
      method: 'POST',
      headers: commanderHeaders(),
      body: JSON.stringify(invitationBody({ email: 'valid@example.org', parishId: 'not-a-parish' })),
    });
    assert.equal(invalidParish.status, 400);
  });
});

test('prevents duplicate pending invitations', async () => {
  await withInvitationApp(async ({ url }) => {
    const email = `duplicate-${Date.now()}@example.org`;
    const body = JSON.stringify(invitationBody({ email }));
    const first = await fetch(url, {
      method: 'POST',
      headers: commanderHeaders(),
      body,
    });
    assert.equal(first.status, 201);

    const duplicate = await fetch(url, {
      method: 'POST',
      headers: commanderHeaders(),
      body,
    });
    assert.equal(duplicate.status, 409);
  });
});

test('records invitation audit context without exposing the invitee email', async () => {
  await withInvitationApp(async ({ url, auditEntries }) => {
    const email = `audit-${Date.now()}@example.org`;
    const response = await fetch(url, {
      method: 'POST',
      headers: commanderHeaders(),
      body: JSON.stringify(invitationBody({ email })),
    });
    assert.equal(response.status, 201);
    const invitation = await response.json();

    assert.equal(auditEntries.length, 1);
    assert.equal(auditEntries[0].parishName, 'Clarendon');
    assert.match(auditEntries[0].details, new RegExp(invitation.id));
    assert.doesNotMatch(JSON.stringify(auditEntries[0]), new RegExp(email));
  });
});

test('creates a Field Officer invitation with selected command details', async () => {
  await withInvitationApp(async ({ url, auditEntries }) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: commanderHeaders(),
      body: JSON.stringify({
        email: 'field.officer@example.org',
        name: 'Alicia Morgan',
        role: 'field_officer',
        roleTitle: 'Field Officer',
        agency: 'Jamaica Red Cross',
        icsFunction: 'Operations',
        contactChannel: 'Radio',
        parishId: 'st-elizabeth',
      }),
    });
    assert.equal(response.status, 201);
    const invitation = await response.json();
    assert.match(invitation.id, /^demo-invite-\d+$/);
    assert.deepEqual(
      Object.fromEntries(Object.entries(invitation).filter(([key]) => key !== 'id' && key !== 'createdAt')),
      {
        email: 'field.officer@example.org',
        name: 'Alicia Morgan',
        role: 'field_officer',
        roleTitle: 'Field Officer',
        agency: 'Jamaica Red Cross',
        icsFunction: 'Operations',
        contactChannel: 'Radio',
        parishId: 'st-elizabeth',
        parishName: 'St. Elizabeth',
        status: 'pending',
      },
    );
    assert.equal(typeof invitation.createdAt, 'string');
    assert.match(auditEntries[0].details, /Field Officer/);
  });
});

test('rejects missing, unsupported, and mismatched command roles', async () => {
  await withInvitationApp(async ({ url }) => {
    const missingRole = invitationBody();
    delete missingRole.role;
    const missingResponse = await fetch(url, {
      method: 'POST',
      headers: commanderHeaders(),
      body: JSON.stringify(missingRole),
    });
    assert.equal(missingResponse.status, 400);

    const unsupportedResponse = await fetch(url, {
      method: 'POST',
      headers: commanderHeaders(),
      body: JSON.stringify(invitationBody({ role: 'system_admin', roleTitle: 'System Administrator' })),
    });
    assert.equal(unsupportedResponse.status, 400);

    const mismatchedResponse = await fetch(url, {
      method: 'POST',
      headers: commanderHeaders(),
      body: JSON.stringify(invitationBody({ role: 'field_officer', roleTitle: 'Ops Section Chief' })),
    });
    assert.equal(mismatchedResponse.status, 400);
  });
});