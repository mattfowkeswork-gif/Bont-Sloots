import { Router, type IRouter } from "express";
import healthRouter from "./health";
import playersRouter from "./players";
import fixturesRouter from "./fixtures";
import statsRouter from "./stats";
import awardsRouter from "./awards";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import seasonsRouter from "./seasons";
import squadStatsRouter from "./squad_stats";
import fixturePlayersRouter from "./fixture_players";
import motmVotesRouter from "./motm_votes";
import playerCommentsRouter from "./player_comments";
import settingsRouter from "./settings";
import fixtureRatingsRouter from "./fixture_ratings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(playerCommentsRouter);
router.use(playersRouter);
router.use(fixturesRouter);
router.use(statsRouter);
router.use(awardsRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(seasonsRouter);
router.use(squadStatsRouter);
router.use(fixturePlayersRouter);
router.use(motmVotesRouter);
router.use(settingsRouter);
router.use(fixtureRatingsRouter);

export default router;
