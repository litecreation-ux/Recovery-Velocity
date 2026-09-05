import { Router, type IRouter, type Request } from "express";
import { Readable } from "stream";
import { createHash } from "crypto";
import { PARISHES, PARISH_MAP, getParishReadinessEvidence } from "../lib/parishes-data";
import { HURRICANE_EVENTS, RECOVERY_FORECASTS } from "../lib/static-data";
import { db, citizenReportsTable, publicRateLimitsTable, publicUploadGrantsTable, reviewItemsTable } from "@workspace/db";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import {
  ListParishesResponse,
  GetParishResponse,
  GetParishHistoricalEventsResponse,
  GetParishCitizenReportsResponse,
  SubmitCitizenReportBody,
  SubmitCitizenReportResponse,
  GetParishRecoveryForecastParams,
  GetParishRecoveryForecastResponse,
} from "@workspace/api-zod";
import { ObjectStorageService } from "../lib/objectStorage.js";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const REPORT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 10;

async function allowCitizenReport(req: Request) {
  const bucket = Math.floor(Date.now() / REPORT_WINDOW_MS);
  const client = req.ip || req.socket.remoteAddress || "unknown";
  const key = createHash("sha256").update(`${client}:${bucket}`).digest("hex");
  const expiresAt = new Date((bucket + 1) * REPORT_WINDOW_MS);
  const [row] = await db.insert(publicRateLimitsTable).values({ key, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: publicRateLimitsTable.key,
      set: { count: sql`${publicRateLimitsTable.count} + 1` },
    })
    .returning();
  return row.count <= MAX_REPORTS_PER_WINDOW;
}
const STORM_SCENARIOS = {
  tropical_storm: { label: "Tropical Storm", multiplier: 0.4 },
  category_1: { label: "Category 1", multiplier: 0.55 },
  category_2: { label: "Category 2", multiplier: 0.75 },
  category_3: { label: "Category 3", multiplier: 1 },
  category_4: { label: "Category 4", multiplier: 1.3 },
  category_5: { label: "Category 5", multiplier: 1.65 },
} as const;

function scaleRecoveryDays(days: number, multiplier: number) {
  return Math.max(0.1, Math.round(days * multiplier * 10) / 10);
}

router.get("/parishes", async (_req, res): Promise<void> => {
  const parishes = PARISHES.map((p) => ({
    id: p.id,
    name: p.name,
    readinessScore: p.readinessScore,
    readinessLevel: p.readinessLevel,
    bottleneck: p.bottleneck,
  }));
  res.json(ListParishesResponse.parse(parishes));
});

router.get("/parishes/:parishId", async (req, res): Promise<void> => {
  const { parishId } = req.params as { parishId: string };
  const parish = PARISH_MAP.get(parishId);
  if (!parish) {
    res.status(404).json({ error: "Parish not found" });
    return;
  }
  res.json(GetParishResponse.parse({
    ...parish,
    readinessEvidence: getParishReadinessEvidence(parishId),
  }));
});

router.get(
  "/parishes/:parishId/historical-events",
  async (req, res): Promise<void> => {
    const { parishId } = req.params as { parishId: string };
    if (!PARISH_MAP.has(parishId)) {
      res.status(404).json({ error: "Parish not found" });
      return;
    }
    const events = HURRICANE_EVENTS.filter((e) =>
      e.parishIds.includes(parishId),
    );
    res.json(GetParishHistoricalEventsResponse.parse(events));
  },
);

router.get(
  "/parishes/:parishId/citizen-reports",
  async (req, res): Promise<void> => {
    const { parishId } = req.params as { parishId: string };
    if (!PARISH_MAP.has(parishId)) {
      res.status(404).json({ error: "Parish not found" });
      return;
    }
    const rows = await db
      .select()
      .from(citizenReportsTable)
      .where(and(
        eq(citizenReportsTable.parishId, parishId),
        inArray(citizenReportsTable.status, ["reviewed", "approved"]),
      ))
      .orderBy(citizenReportsTable.createdAt);
    const mapped = rows.map((r) => ({
      id: r.id,
      parishId: r.parishId,
      reporterName: r.reporterName,
      content: r.content,
      timestamp: r.createdAt.toISOString(),
      category: r.category as
        | "infrastructure"
        | "medical"
        | "supplies"
        | "flooding"
        | "shelter"
        | "other",
      status: r.status as "pending" | "reviewed" | "approved" | "rejected",
      location: r.location ?? undefined,
      hasPhoto: Boolean(r.photoObjectPath),
      photoObjectPath: ["reviewed", "approved"].includes(r.status) && r.photoObjectPath
        ? `/parishes/${r.parishId}/citizen-reports/${r.id}/photo`
        : undefined,
    }));
    res.json(GetParishCitizenReportsResponse.parse(mapped));
  },
);

router.post(
  "/parishes/:parishId/citizen-reports",
  async (req, res): Promise<void> => {
    const { parishId } = req.params as { parishId: string };
    if (!PARISH_MAP.has(parishId)) {
      res.status(404).json({ error: "Parish not found" });
      return;
    }
    if (!(await allowCitizenReport(req))) {
      res.status(429).json({ error: "Too many reports submitted. Try again later." });
      return;
    }
    const parsed = SubmitCitizenReportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    let photoMetadata: { objectPath: string; contentType: string; size: number } | null = null;
    if (parsed.data.photoObjectPath) {
      const [grant] = await db.select().from(publicUploadGrantsTable).where(and(
        eq(publicUploadGrantsTable.objectPath, parsed.data.photoObjectPath),
        isNull(publicUploadGrantsTable.consumedAt),
        gt(publicUploadGrantsTable.expiresAt, new Date()),
      ));
      if (!grant) {
        res.status(400).json({ error: "Uploaded photo could not be found or has expired." });
        return;
      }
      photoMetadata = { objectPath: grant.objectPath, contentType: grant.contentType, size: grant.sizeBytes };
    }
    const parishName = PARISH_MAP.get(parishId)!.name;
    const row = await db.transaction(async (tx) => {
      if (photoMetadata) {
        const [consumed] = await tx.update(publicUploadGrantsTable)
          .set({ consumedAt: new Date() })
          .where(and(
            eq(publicUploadGrantsTable.objectPath, photoMetadata.objectPath),
            isNull(publicUploadGrantsTable.consumedAt),
          ))
          .returning();
        if (!consumed) throw new Error("UPLOAD_ALREADY_CONSUMED");
      }
      const [created] = await tx
        .insert(citizenReportsTable)
        .values({
          parishId,
          reporterName: parsed.data.reporterName.trim(),
          content: parsed.data.content.trim(),
          category: parsed.data.category,
          status: "pending",
          location: parsed.data.location?.trim() || null,
          photoObjectPath: photoMetadata?.objectPath ?? null,
          photoContentType: photoMetadata?.contentType ?? null,
          photoSizeBytes: photoMetadata?.size ?? null,
        })
        .returning();
      await tx.insert(reviewItemsTable).values({
        parishId,
        parishName,
        type: "citizen_report",
        title: `Citizen report: ${parsed.data.category.replaceAll("_", " ")}`,
        description: parsed.data.content.trim(),
        status: "pending",
        metadata: {
          kind: "citizen_report",
          reportId: created.id,
          reporterName: created.reporterName,
          location: created.location,
          photoObjectPath: created.photoObjectPath,
          photoContentType: created.photoContentType,
          photoSizeBytes: created.photoSizeBytes,
          evidenceStatus: "unverified_citizen_submission",
        },
      });
      return created;
    });
    res.status(201).json(
      SubmitCitizenReportResponse.parse({
        id: row.id,
        parishId: row.parishId,
        reporterName: row.reporterName,
        content: row.content,
        timestamp: row.createdAt.toISOString(),
        category: row.category,
        status: row.status,
        location: row.location ?? undefined,
        hasPhoto: Boolean(row.photoObjectPath),
      }),
    );
  },
);

router.get("/parishes/:parishId/citizen-reports/:reportId/photo", async (req, res): Promise<void> => {
  const parishId = String(req.params.parishId);
  const reportId = Number(req.params.reportId);
  const [report] = await db.select().from(citizenReportsTable).where(and(
    eq(citizenReportsTable.id, reportId),
    eq(citizenReportsTable.parishId, parishId),
  ));
  if (!report?.photoObjectPath || !["reviewed", "approved"].includes(report.status)) {
    res.status(404).json({ error: "Approved photo not found" });
    return;
  }
  const file = await objectStorageService.getObjectEntityFile(report.photoObjectPath);
  const response = await objectStorageService.downloadObject(file);
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
  else res.end();
});

router.get(
  "/parishes/:parishId/recovery-forecast/:stormScenario",
  async (req, res): Promise<void> => {
    const parsedParams = GetParishRecoveryForecastParams.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ error: parsedParams.error.message });
      return;
    }
    const { parishId, stormScenario } = parsedParams.data;
    if (!PARISH_MAP.has(parishId)) {
      res.status(404).json({ error: "Parish not found" });
      return;
    }
    const forecast = RECOVERY_FORECASTS[parishId];
    if (!forecast) {
      res.status(404).json({ error: "Forecast not found" });
      return;
    }
    const scenario = STORM_SCENARIOS[stormScenario];
    res.json(
      GetParishRecoveryForecastResponse.parse({
        parishId,
        stormScenario,
        stormLabel: scenario.label,
        scenarioMultiplier: scenario.multiplier,
        powerRestorationDays: scaleRecoveryDays(forecast.powerRestorationDays, scenario.multiplier),
        roadAccessDays: scaleRecoveryDays(forecast.roadAccessDays, scenario.multiplier),
        waterRestorationDays: scaleRecoveryDays(forecast.waterRestorationDays, scenario.multiplier),
        communicationsDays: scaleRecoveryDays(forecast.communicationsDays, scenario.multiplier),
        evacuationCapacityDays: scaleRecoveryDays(forecast.evacuationCapacityDays, scenario.multiplier),
        overallRecoveryDays: scaleRecoveryDays(forecast.overallRecoveryDays, scenario.multiplier),
        modelVersion: "jamaica-recovery-planning-v2",
        sourceName: "RVP planning benchmark using historical Jamaica event observations",
        sourceDate: "2024-07",
        calculation: `${scenario.label} planning range = the parish's Category 3 benchmark multiplied by ${scenario.multiplier}. Parish infrastructure and access constraints remain represented by the benchmark.`,
        limitations: "This is not a predictive or life-safety model. Actual restoration depends on storm track, damage, logistics, utility assessments, and official operational decisions.",
      }),
    );
  },
);

export default router;
