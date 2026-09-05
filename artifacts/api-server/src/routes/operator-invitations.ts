import { db, auditLogTable } from '@workspace/db';
import { createOperatorInvitationsRouter } from '../lib/operator-invitations-router.js';

export default createOperatorInvitationsRouter({
  recordAudit: async (entry) => {
    await db.insert(auditLogTable).values(entry);
  },
});