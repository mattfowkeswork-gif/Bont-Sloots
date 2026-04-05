import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

router.get("/settings/:key", async (req, res): Promise<void> => {
  const { key } = req.params;
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  res.json({ key, value: setting?.value ?? null });
});

router.put("/settings/:key", async (req, res): Promise<void> => {
  const { key } = req.params;
  const parsed = z.object({ value: z.string() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "value is required" }); return; }
  const [setting] = await db
    .insert(settingsTable)
    .values({ key, value: parsed.data.value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: parsed.data.value, updatedAt: new Date() } })
    .returning();
  res.json({ key: setting.key, value: setting.value });
});

export default router;
