import { Router, type IRouter } from "express";
import { recalculateFixtureValues } from "./value_calculator";

const router: IRouter = Router();

router.post("/admin/recalculate-values", async (_req, res): Promise<void> => {
  try {
    await recalculateFixtureValues();
    res.json({ success: true, message: "Values recalculated for all played fixtures" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
