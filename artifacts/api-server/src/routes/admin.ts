import { Router, type IRouter } from "express";
import { AdminLoginBody } from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "bont2025";

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ success: false, token: null });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  res.json({ success: true, token });
});

export default router;
