import { Router } from "express";
import { and, eq, gte } from "drizzle-orm";
import { db, reviewItemsTable } from "@workspace/db";
import { PARISH_MAP } from "../lib/parishes-data.js";
import { canCoordinateForParish, getCommandAuthority } from "../lib/command-authority.js";
import { generateRegionalAidDraft, type RegionalAidIncident } from "../lib/regional-aid.js";

const router = Router();

router.post("/regional-aid/assess", async (req, res): Promise<void> => {
  const authority = await getCommandAuthority(req);
  if (!authority || !["national_coordinator", "parish_manager"].includes(authority.role)) {
    res.status(403).json({ error: "Only Incident Command or an authorized parish coordinator may prepare a regional aid request" });
    return;
  }

  const parishId = typeof req.body?.parishId === "string" ? req.body.parishId.trim() : "";
  const parish = PARISH_MAP.get(parishId);
  if (!parish) {
    res.status(400).json({ error: "A valid Jamaica parish is required" });
    return;
  }
  if (!canCoordinateForParish(authority, parishId)) {
    res.status(403).json({ error: "This parish is outside your assigned operational scope" });
    return;
  }

  const rows = await db
    .select()
    .from(reviewItemsTable)
    .where(and(
      eq(reviewItemsTable.parishId, parishId),
      gte(reviewItemsTable.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    ));
  const incidents: RegionalAidIncident[] = rows
    .filter((row) => row.status !== "rejected")
    .map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));

  let result: Awaited<ReturnType<typeof generateRegionalAidDraft>>;
  try {
    result = await generateRegionalAidDraft(parishId, parish.name, incidents);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown AI failure";
    res.status(502).json({ error: `Regional aid draft could not be generated: ${detail}` });
    return;
  }

  if (!result.metadata) {
    res.status(200).json({ created: false, reason: result.reason, reviewItem: null });
    return;
  }

  const duplicate = rows.find((row) => {
    const metadata = row.metadata;
    return row.type === "resource_request"
      && row.status === "pending"
      && metadata
      && typeof metadata === "object"
      && (metadata as Record<string, unknown>).kind === "regional_aid_request"
      && (metadata as Record<string, unknown>).resourceType === result.metadata!.resourceType;
  });
  if (duplicate) {
    res.status(409).json({ error: "A pending regional aid draft already exists for this parish and resource.", reviewItemId: duplicate.id });
    return;
  }

  const [row] = await db.insert(reviewItemsTable).values({
    parishId,
    parishName: parish.name,
    type: "resource_request",
    title: result.metadata.title,
    description: result.metadata.requestedMessage,
    status: "pending",
    metadata: result.metadata,
  }).returning();

  res.status(201).json({
    created: true,
    reason: null,
    reviewItem: {
      id: row.id,
      parishId: row.parishId,
      parishName: row.parishName,
      type: row.type,
      title: row.title,
      description: row.description,
      status: row.status,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    },
  });
});

export default router;