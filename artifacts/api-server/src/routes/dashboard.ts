import { Router, type IRouter } from "express";
import { PARISHES } from "../lib/parishes-data";
import { db, reviewItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const criticalCount = PARISHES.filter(
    (p) => p.readinessLevel === "Critical",
  ).length;
  const atRiskCount = PARISHES.filter(
    (p) => p.readinessLevel === "At risk",
  ).length;
  const moderateCount = PARISHES.filter(
    (p) => p.readinessLevel === "Moderate",
  ).length;
  const avgReadinessScore =
    PARISHES.reduce((sum, p) => sum + p.readinessScore, 0) / PARISHES.length;

  const pendingItems = await db
    .select()
    .from(reviewItemsTable)
    .where(eq(reviewItemsTable.status, "pending"));

  const summary = {
    totalParishes: PARISHES.length,
    criticalCount,
    atRiskCount,
    moderateCount,
    avgReadinessScore: Math.round(avgReadinessScore * 10) / 10,
    pendingReviewCount: pendingItems.length,
    activeAgents: 6,
    recentEvents: [
      "Hurricane Beryl — July 2024",
      "Hurricane Sandy — October 2012",
      "Hurricane Ivan — September 2004",
      "Hurricane Gilbert — September 1988",
    ],
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;
