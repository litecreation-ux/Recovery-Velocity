import { Router, type IRouter } from "express";
import { AGENTS } from "../lib/static-data";
import { getResourceExchangeAgentStatus } from "../lib/resource-store";
import { ListAgentsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/agents", async (_req, res): Promise<void> => {
  const rea = getResourceExchangeAgentStatus();
  const all = [
    ...AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      status: a.status as "active" | "idle" | "error" | "paused",
      lastAction: a.lastAction,
      lastActionAt: a.lastActionAt,
      parishesMonitored: a.parishesMonitored,
    })),
    {
      id: rea.id,
      name: rea.name,
      description: rea.description,
      status: rea.status,
      lastAction: rea.lastAction,
      lastActionAt: rea.lastActionAt,
      parishesMonitored: rea.parishesMonitored,
    },
  ];
  res.json(ListAgentsResponse.parse(all));
});

export default router;
