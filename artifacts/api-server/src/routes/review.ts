import { Router, type IRouter } from "express";
import { Readable } from "stream";
import { db, auditLogTable, citizenReportsTable, reviewItemsTable, unifiedCommandWorkspacesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListReviewItemsQueryParams,
  ListReviewItemsResponse,
  UpdateReviewItemParams,
  UpdateReviewItemBody,
  UpdateReviewItemResponse,
} from "@workspace/api-zod";
import { canCoordinateForParish, getAuthenticatedCommandAuthority, getCommandAuthority } from "../lib/command-authority.js";
import { REGIONAL_AID_METADATA_KIND, type RegionalAidMetadata } from "../lib/regional-aid.js";
import { getWorkspace, WORKSPACE_ID } from "./unified-command.js";
import { ObjectStorageService } from "../lib/objectStorage.js";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function mapItem(r: typeof reviewItemsTable.$inferSelect) {
  const rawMetadata = r.metadata && typeof r.metadata === "object"
    ? r.metadata as Record<string, unknown>
    : null;
  const metadata = r.type === "citizen_report" && rawMetadata
    ? {
        kind: "citizen_report",
        evidenceStatus: "unverified_citizen_submission",
        ...rawMetadata,
        photoObjectPath: rawMetadata.photoObjectPath ? `/review-items/${r.id}/photo` : null,
      }
    : r.metadata ?? null;
  return {
    id: r.id,
    parishId: r.parishId,
    parishName: r.parishName,
    type: r.type as
      | "citizen_report"
      | "resource_request"
      | "evacuation_plan"
      | "infrastructure_alert",
    title: r.title,
    description: r.description,
    status: r.status as "pending" | "approved" | "rejected",
    metadata,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    reviewedBy: r.reviewedBy ?? null,
  };
}

router.get("/review-items", async (req, res): Promise<void> => {
  const authority = await getAuthenticatedCommandAuthority(req);
  if (!authority || !["national_coordinator", "parish_manager"].includes(authority.role)) {
    res.status(403).json({ error: "Incident Command authority is required to view review items" });
    return;
  }
  const qp = ListReviewItemsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const conditions = [];
  if (authority.role === "parish_manager" && authority.parishId) {
    conditions.push(eq(reviewItemsTable.parishId, authority.parishId));
  }
  if (qp.data.parishId) {
    if (!canCoordinateForParish(authority, qp.data.parishId)) {
      res.status(403).json({ error: "This parish is outside your assigned operational scope" });
      return;
    }
    conditions.push(eq(reviewItemsTable.parishId, qp.data.parishId));
  }
  if (qp.data.status) {
    conditions.push(eq(reviewItemsTable.status, qp.data.status));
  }

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(reviewItemsTable)
          .where(and(...conditions))
          .orderBy(reviewItemsTable.createdAt)
      : await db
          .select()
          .from(reviewItemsTable)
          .orderBy(reviewItemsTable.createdAt);

  res.json(ListReviewItemsResponse.parse(rows.map(mapItem)));
});

router.get("/review-items/:id/photo", async (req, res): Promise<void> => {
  const authority = await getAuthenticatedCommandAuthority(req);
  const id = Number(req.params.id);
  const [item] = await db.select().from(reviewItemsTable).where(eq(reviewItemsTable.id, id));
  if (!item || item.type !== "citizen_report") {
    res.status(404).json({ error: "Review photo not found" });
    return;
  }
  if (!authority || !["national_coordinator", "parish_manager"].includes(authority.role) || !canCoordinateForParish(authority, item.parishId)) {
    res.status(403).json({ error: "Incident Command authority is required to view pending evidence" });
    return;
  }
  const objectPath = (item.metadata as { photoObjectPath?: unknown } | null)?.photoObjectPath;
  if (typeof objectPath !== "string") {
    res.status(404).json({ error: "Review photo not found" });
    return;
  }
  const file = await objectStorageService.getObjectEntityFile(objectPath);
  const response = await objectStorageService.downloadObject(file);
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
  else res.end();
});

router.patch("/review-items/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateReviewItemParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateReviewItemBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const reason = body.data.reason?.trim();
  if (body.data.status === "rejected" && !reason) {
    res.status(400).json({ error: "A reason is required when declining a review item" });
    return;
  }

  const [current] = await db.select().from(reviewItemsTable)
    .where(eq(reviewItemsTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Review item not found" });
    return;
  }
  const metadata = current.metadata as RegionalAidMetadata | null;
  const isRegionalAid = current.type === "resource_request"
    && metadata?.kind === REGIONAL_AID_METADATA_KIND;
  let authority: Awaited<ReturnType<typeof getCommandAuthority>> = null;
  if (isRegionalAid || current.type === "citizen_report") {
    authority = current.type === "citizen_report"
      ? await getAuthenticatedCommandAuthority(req)
      : await getCommandAuthority(req);
    if (!authority || !["national_coordinator", "parish_manager"].includes(authority.role)) {
      res.status(403).json({ error: "Only Incident Command or an authorized parish coordinator may decide a regional aid draft" });
      return;
    }
    if (!canCoordinateForParish(authority, current.parishId)) {
      res.status(403).json({ error: "This parish is outside your assigned operational scope" });
      return;
    }
  }
  const reviewer = (isRegionalAid || current.type === "citizen_report") ? authority!.name : body.data.reviewedBy ?? "Coordinator";
  if (isRegionalAid && body.data.status === "approved") {
    await getWorkspace(WORKSPACE_ID);
  }

  let row: typeof reviewItemsTable.$inferSelect | null;
  try {
    row = await db.transaction(async (tx) => {
      const [updatedRow] = await tx
        .update(reviewItemsTable)
        .set({
          status: body.data.status,
          reviewedAt: new Date(),
          reviewedBy: reviewer,
        })
        .where(and(
          eq(reviewItemsTable.id, params.data.id),
          eq(reviewItemsTable.status, "pending"),
        ))
        .returning();

      if (!updatedRow) throw new Error("REVIEW_CONFLICT");

      if (current.type === "citizen_report") {
        const reportId = Number((current.metadata as { reportId?: unknown } | null)?.reportId);
        if (Number.isInteger(reportId)) {
          await tx
            .update(citizenReportsTable)
            .set({ status: body.data.status })
            .where(eq(citizenReportsTable.id, reportId));
        }
      }

      if (isRegionalAid && body.data.status === "approved") {
        const [workspace] = await tx.select().from(unifiedCommandWorkspacesTable)
          .where(eq(unifiedCommandWorkspacesTable.id, WORKSPACE_ID));
        if (!workspace) throw new Error("Unified Command workspace is unavailable");
        const now = new Date();
        const existingAid = Array.isArray(workspace.mutualAid) ? workspace.mutualAid : [];
        const aidId = `ai-aid-${metadata!.draftId}`;
        const aidRecord = {
          id: aidId,
          requester: `${current.parishName} Incident Command`,
           provider: "No confirmed provider",
           planningCandidates: metadata!.suggestedCountries,
          resource: metadata!.resourceLabel,
          quantity: metadata!.quantity,
           requestedQuantity: metadata!.quantity,
          unit: metadata!.unit,
          destination: metadata!.destination,
          status: "requested",
          approval: "pending",
          eta: null,
          resourceDeclarationId: null,
          createdAt: now.toISOString(),
        };
        const nextMutualAid = existingAid.some((item: any) => item.id === aidId)
          ? existingAid.map((item: any) => item.id === aidId ? aidRecord : item)
          : [...existingAid, aidRecord];
        const accessEvents = Array.isArray(workspace.accessEvents) ? workspace.accessEvents : [];
        const [updatedWorkspace] = await tx.update(unifiedCommandWorkspacesTable).set({
          mutualAid: nextMutualAid,
          accessEvents: [
            ...accessEvents,
            {
              id: `evt-${metadata!.draftId}`,
              action: "regional_aid_approved",
              actor: reviewer,
              subject: metadata!.title,
              timestamp: now.toISOString(),
              detail: "Approved internal AI-assisted draft and created a requested mutual-aid record. Counterpart acceptance and capacity remain pending.",
            },
          ],
          revision: workspace.revision + 1,
          updatedAt: now,
        }).where(and(
          eq(unifiedCommandWorkspacesTable.id, WORKSPACE_ID),
          eq(unifiedCommandWorkspacesTable.revision, workspace.revision),
        )).returning();
        if (!updatedWorkspace) throw new Error("WORKSPACE_CONFLICT");
      }

      await tx.insert(auditLogTable).values({
      agentName: "AuditLogger",
      action: body.data.status === "approved"
        ? "Incident decision approved"
        : "Incident decision declined",
      parishId: updatedRow.parishId,
      parishName: updatedRow.parishName,
      details: body.data.status === "approved"
        ? `${updatedRow.title} (review item #${updatedRow.id}) approved by ${updatedRow.reviewedBy ?? "Coordinator"} in Incident Command.${isRegionalAid ? ` AI draft ${metadata!.draftId}; provider ${metadata!.aiProvider}; model ${metadata!.aiModel}; counterpart capacity unverified.` : ""}`
        : `${updatedRow.title} (review item #${updatedRow.id}) declined by ${updatedRow.reviewedBy ?? "Coordinator"} in Incident Command. Reason: ${reason}`,
      });

      return updatedRow;
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "REVIEW_CONFLICT" || error.message === "WORKSPACE_CONFLICT")) {
      res.status(409).json({ error: "This decision or workspace changed before the update completed. Refresh and try again." });
      return;
    }
    throw error;
  }

  if (!row) {
    res.status(404).json({ error: "Review item not found" });
    return;
  }

  res.json(UpdateReviewItemResponse.parse(mapItem(row)));
});

export default router;
