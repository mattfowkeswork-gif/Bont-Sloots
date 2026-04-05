import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, statsTable, playersTable, awardsTable } from "@workspace/db";
import {
  CreateStatBody,
  DeleteStatParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const players = await db.select().from(playersTable).orderBy(playersTable.name);

  const goalCounts = await db
    .select({
      playerId: statsTable.playerId,
      count: sql<number>`count(*)::int`,
    })
    .from(statsTable)
    .where(eq(statsTable.type, "goal"))
    .groupBy(statsTable.playerId);

  const assistCounts = await db
    .select({
      playerId: statsTable.playerId,
      count: sql<number>`count(*)::int`,
    })
    .from(statsTable)
    .where(eq(statsTable.type, "assist"))
    .groupBy(statsTable.playerId);

  const momCounts = await db
    .select({
      playerId: awardsTable.playerId,
      count: sql<number>`count(*)::int`,
    })
    .from(awardsTable)
    .where(eq(awardsTable.type, "mom"))
    .groupBy(awardsTable.playerId);

  const motmCounts = await db
    .select({
      playerId: awardsTable.playerId,
      count: sql<number>`count(*)::int`,
    })
    .from(awardsTable)
    .where(eq(awardsTable.type, "motm"))
    .groupBy(awardsTable.playerId);

  const result = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    totalGoals: goalCounts.find(g => g.playerId === p.id)?.count ?? 0,
    totalAssists: assistCounts.find(a => a.playerId === p.id)?.count ?? 0,
    momCount: momCounts.find(m => m.playerId === p.id)?.count ?? 0,
    motmCount: motmCounts.find(m => m.playerId === p.id)?.count ?? 0,
  }));

  result.sort((a, b) => (b.totalGoals - a.totalGoals) || (b.totalAssists - a.totalAssists));

  res.json(result);
});

router.post("/stats", async (req, res): Promise<void> => {
  const parsed = CreateStatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [stat] = await db.insert(statsTable).values({
    playerId: parsed.data.playerId,
    fixtureId: parsed.data.fixtureId,
    type: parsed.data.type,
  }).returning();
  res.status(201).json({
    id: stat.id,
    playerId: stat.playerId,
    fixtureId: stat.fixtureId,
    type: stat.type,
    createdAt: stat.createdAt,
  });
});

router.delete("/stats/:id", async (req, res): Promise<void> => {
  const params = DeleteStatParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [stat] = await db.delete(statsTable).where(eq(statsTable.id, params.data.id)).returning();
  if (!stat) {
    res.status(404).json({ error: "Stat not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
