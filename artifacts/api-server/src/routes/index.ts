import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import parishesRouter from "./parishes.js";
import dashboardRouter from "./dashboard.js";
import reviewRouter from "./review.js";
import agentsRouter from "./agents.js";
import auditRouter from "./audit.js";
import resourcesRouter from "./resources.js";
import exchangeRouter from "./exchange.js";
import tasksRouter from "./tasks.js";
import riskRouter from "./risk.js";
import operatorInvitationsRouter from "./operator-invitations.js";
import unifiedCommandRouter from "./unified-command.js";
import regionalAidRouter from "./regional-aid.js";
import storageRouter from "./storage.js";
import onboardingRouter from "./onboarding.js";
import communicationsRouter from "./communications.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(resourcesRouter);
router.use(exchangeRouter);
router.use(tasksRouter);
router.use(riskRouter);
router.use(parishesRouter);
router.use(dashboardRouter);
router.use(reviewRouter);
router.use(agentsRouter);
router.use(auditRouter);
router.use(operatorInvitationsRouter);
router.use(unifiedCommandRouter);
router.use(regionalAidRouter);
router.use(storageRouter);
router.use(onboardingRouter);
router.use(communicationsRouter);

export default router;
