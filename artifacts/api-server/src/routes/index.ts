import { Router, type IRouter } from "express";
import healthRouter from "./health";
import playersRouter from "./players";
import fixturesRouter from "./fixtures";
import statsRouter from "./stats";
import awardsRouter from "./awards";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(playersRouter);
router.use(fixturesRouter);
router.use(statsRouter);
router.use(awardsRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
