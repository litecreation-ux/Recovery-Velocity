import { Router, type IRouter, type Request } from 'express';
import { PARISHES } from './parishes-data.js';
import {
  createOperatorInvitation,
  findPendingOperatorInvitation,
  listOperatorInvitations,
  type OperatorInvitation,
} from './operator-invitation-store.js';
import { isDemoAuthorityEnabled } from './demo-authority.js';

export type OperatorInvitationAudit = {
  agentName: string;
  action: string;
  parishId: string;
  parishName: string;
  details: string;
};

const INVITATION_ROLES = new Set(['parish_manager', 'field_officer']);
const ROLE_TITLES = {
  parish_manager: 'Ops Section Chief',
  field_officer: 'Field Officer',
} as const;
const AGENCIES = new Set([
  'National Disaster Risk Management Council',
  'Jamaica Defence Force',
  'Jamaica Constabulary Force',
  'Jamaica Fire Brigade',
  'Ministry of Health & Wellness',
  'Parish Council',
  'National Works Agency',
  'Jamaica Red Cross',
]);
const ICS_FUNCTIONS = new Set(['Command', 'Operations', 'Planning', 'Logistics', 'Finance / Administration', 'Safety', 'Public Information']);
const CONTACT_CHANNELS = new Set(['Email', 'Radio', 'Phone', 'Satellite']);

type InvitationRouterDependencies = {
  recordAudit: (entry: OperatorInvitationAudit) => Promise<void>;
};

export function buildOperatorInvitationAudit(invitation: OperatorInvitation): OperatorInvitationAudit {
  return {
    agentName: 'Incident Commander',
    action: `${invitation.roleTitle} invitation created`,
    parishId: invitation.parishId,
    parishName: invitation.parishName,
    details: `Demo invitation ${invitation.id} created for the ${invitation.roleTitle} role at ${invitation.agency}; assigned parish: ${invitation.parishName}. No email was sent.`,
  };
}

function isDemoIncidentCommander(req: Request): boolean {
  return isDemoAuthorityEnabled()
    && req.header('x-rvp-demo-role') === 'national_coordinator';
}

function parseInvitationInput(body: unknown): {
  email: string;
  parishId: string;
  name: string;
  role: 'parish_manager' | 'field_officer';
  roleTitle: string;
  agency: string;
  icsFunction: string;
  contactChannel: string;
} | null {
  if (!body || typeof body !== 'object') return null;
  const input = body as Record<string, unknown>;
  if (
    typeof input.email !== 'string'
    || typeof input.parishId !== 'string'
    || typeof input.name !== 'string'
    || typeof input.role !== 'string'
    || typeof input.roleTitle !== 'string'
    || typeof input.agency !== 'string'
    || typeof input.icsFunction !== 'string'
    || typeof input.contactChannel !== 'string'
  ) return null;
  return {
    email: input.email.trim().toLowerCase(),
    parishId: input.parishId,
    name: input.name.trim(),
    role: input.role as 'parish_manager' | 'field_officer',
    roleTitle: input.roleTitle.trim(),
    agency: input.agency.trim(),
    icsFunction: input.icsFunction.trim(),
    contactChannel: input.contactChannel.trim(),
  };
}

export function createOperatorInvitationsRouter(
  dependencies: InvitationRouterDependencies,
): IRouter {
  const router: IRouter = Router();

  router.get('/operator-invitations', (req, res): void => {
    if (!isDemoIncidentCommander(req)) {
      res.status(403).json({ error: 'Only the Incident Commander can view operator invitations' });
      return;
    }
    res.json(listOperatorInvitations());
  });

  router.post('/operator-invitations', async (req, res): Promise<void> => {
    if (!isDemoIncidentCommander(req)) {
      res.status(403).json({ error: 'Only the Incident Commander can create operator invitations' });
      return;
    }

    const input = parseInvitationInput(req.body);
    if (!input) {
      res.status(400).json({ error: 'Complete every command member invitation field' });
      return;
    }

    const email = input.email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Provide a valid email address' });
      return;
    }
    const parish = PARISHES.find((item) => item.id === input.parishId);
    if (!parish) {
      res.status(400).json({ error: 'Select a valid Jamaica parish' });
      return;
    }
    if (!INVITATION_ROLES.has(input.role)) {
      res.status(400).json({ error: 'Select a supported command role' });
      return;
    }
    if (input.roleTitle !== ROLE_TITLES[input.role]) {
      res.status(400).json({ error: 'Role title does not match the selected command role' });
      return;
    }
    if (!input.name) {
      res.status(400).json({ error: 'Provide the invitee name' });
      return;
    }
    if (!AGENCIES.has(input.agency)) {
      res.status(400).json({ error: 'Select a supported agency' });
      return;
    }
    if (!ICS_FUNCTIONS.has(input.icsFunction)) {
      res.status(400).json({ error: 'Select a supported ICS function' });
      return;
    }
    if (!CONTACT_CHANNELS.has(input.contactChannel)) {
      res.status(400).json({ error: 'Select a supported contact channel' });
      return;
    }

    if (findPendingOperatorInvitation(email)) {
      res.status(409).json({ error: 'A pending invitation already exists for this email address' });
      return;
    }

    const invitation = createOperatorInvitation({
      email,
      name: input.name,
      role: input.role,
      agency: input.agency,
      icsFunction: input.icsFunction,
      contactChannel: input.contactChannel,
      parishId: parish.id,
      parishName: parish.name,
    });

    await dependencies.recordAudit(buildOperatorInvitationAudit(invitation));
    res.status(201).json(invitation);
  });

  return router;
}