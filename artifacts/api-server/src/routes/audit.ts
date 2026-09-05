import { Router, type IRouter } from "express";
import { db, auditLogTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListAuditLogQueryParams,
  ListAuditLogResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/audit-log", async (req, res): Promise<void> => {
  const qp = ListAuditLogQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  let query = db
    .select()
    .from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt))
    .$dynamic();

  if (qp.data.parishId) {
    query = query.where(eq(auditLogTable.parishId, qp.data.parishId));
  }

  if (qp.data.limit) {
    const rawLimit = Number(qp.data.limit);
    if (!isNaN(rawLimit) && rawLimit > 0) {
      query = query.limit(rawLimit);
    }
  }

  const rows = await query;

  const mapped = rows.map((r) => ({
    id: r.id,
    agentName: r.agentName,
    action: r.action,
    parishId: r.parishId,
    parishName: r.parishName,
    timestamp: r.createdAt.toISOString(),
    details: r.details,
  }));

  res.json(ListAuditLogResponse.parse(mapped));
});

export default router;
