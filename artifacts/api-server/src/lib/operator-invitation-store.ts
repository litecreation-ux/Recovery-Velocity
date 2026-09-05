export type OperatorInvitation = {
  id: string;
  email: string;
  name: string;
  role: 'parish_manager' | 'field_officer';
  roleTitle: string;
  agency: string;
  icsFunction: string;
  contactChannel: string;
  parishId: string;
  parishName: string;
  status: 'pending';
  createdAt: string;
};

let nextInvitationId = 1;
const invitations: OperatorInvitation[] = [];

export function listOperatorInvitations(): OperatorInvitation[] {
  return invitations.map((invitation) => ({ ...invitation }));
}

export function findPendingOperatorInvitation(email: string): OperatorInvitation | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return invitations.find(
    (invitation) => invitation.status === 'pending' && invitation.email === normalizedEmail,
  );
}

export function createOperatorInvitation(input: {
  email: string;
  name: string;
  role: 'parish_manager' | 'field_officer';
  agency: string;
  icsFunction: string;
  contactChannel: string;
  parishId: string;
  parishName: string;
}): OperatorInvitation {
  const invitation: OperatorInvitation = {
    id: `demo-invite-${nextInvitationId++}`,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    role: input.role,
    roleTitle: input.role === 'field_officer' ? 'Field Officer' : 'Ops Section Chief',
    agency: input.agency.trim(),
    icsFunction: input.icsFunction.trim(),
    contactChannel: input.contactChannel.trim(),
    parishId: input.parishId,
    parishName: input.parishName,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  invitations.unshift(invitation);
  return { ...invitation };
}