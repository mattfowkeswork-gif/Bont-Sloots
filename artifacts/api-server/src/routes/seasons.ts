import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, seasonsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().positive() });

const CreateSeasonBody = z.object({
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean().default(false),
});

function mapSeason(s: typeof seasonsTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    startDate: s.startDate,
    endDate: s.endDate,
    isCurrent: s.isCurrent,
    createdAt: s.createdAt,
  };
}

router.get("/seasons", async (_req, res): Promise<void> => {
  const seasons = await db.select().from(seasonsTable).orderBy(seasonsTable.startDate);
  res.json(seasons.map(mapSeason));
});

router.post("/seasons", async (req, res): Promise<void> => {
  const parsed = CreateSeasonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.isCurrent) {
    await db.update(seasonsTable).set({ isCurrent: false });
  }

  const [season] = await db.insert(seasonsTable).values({
    name: parsed.data.name,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    isCurrent: parsed.data.isCurrent,
  }).returning();

  res.status(201).json(mapSeason(season));
});

router.put("/seasons/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid season ID" });
    return;
  }
  const parsed = CreateSeasonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.isCurrent) {
    // Unset all other seasons as current
    await db.update(seasonsTable).set({ isCurrent: false });
  }

  const [season] = await db
    .update(seasonsTable)
    .set({
      name: parsed.data.name,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      isCurrent: parsed.data.isCurrent,
    })
    .where(eq(seasonsTable.id, params.data.id))
    .returning();

  if (!season) {
    res.status(404).json({ error: "Season not found" });
    return;
  }
  res.json(mapSeason(season));
});

router.delete("/seasons/:id", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid season ID" });
    return;
  }
  const [season] = await db.delete(seasonsTable).where(eq(seasonsTable.id, params.data.id)).returning();
  if (!season) {
    res.status(404).json({ error: "Season not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
