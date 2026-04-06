import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, statsTable, playersTable, awardsTable, fixturePlayersTable, fixturesTable } from "@workspace/db";
import { recalculateFixtureValues } from "./value_calculator";
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

// Returns raw stat rows for a specific fixture (used by admin Emergency GK UI)
router.get("/fixtures/:id/stats", async (req, res): Promise<void> => {
  const fixtureId = parseInt(req.params.id);
  if (isNaN(fixtureId)) { res.status(400).json({ error: "Invalid fixture ID" }); return; }
  const type = req.query.type as string | undefined;
  const rows = type
    ? await db.select().from(statsTable).where(and(eq(statsTable.fixtureId, fixtureId), eq(statsTable.type, type)))
    : await db.select().from(statsTable).where(eq(statsTable.fixtureId, fixtureId));
  res.json(rows.map(r => ({ id: r.id, playerId: r.playerId, fixtureId: r.fixtureId, type: r.type })));
});

router.post("/stats", async (req, res): Promise<void> => {
  const parsed = CreateStatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { playerId, fixtureId, type } = parsed.data;

  const [stat] = await db.insert(statsTable).values({ playerId, fixtureId, type }).returning();

  // If this fixture is played, ensure the player is marked as present so the
  // value calculator can include them, then recalculate.
  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, fixtureId));
  if (fixture?.played) {
    const [existing] = await db
      .select()
      .from(fixturePlayersTable)
      .where(and(eq(fixturePlayersTable.fixtureId, fixtureId), eq(fixturePlayersTable.playerId, playerId)));

    if (existing) {
      if (!existing.present) {
        await db
          .update(fixturePlayersTable)
          .set({ present: true })
          .where(and(eq(fixturePlayersTable.fixtureId, fixtureId), eq(fixturePlayersTable.playerId, playerId)));
      }
    } else {
      await db.insert(fixturePlayersTable).values({ fixtureId, playerId, present: true });
    }

    await recalculateFixtureValues(fixtureId);
  }

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

  await recalculateFixtureValues(stat.fixtureId);

  res.sendStatus(204);
});

export default router;
