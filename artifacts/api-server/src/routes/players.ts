import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, playersTable, statsTable, awardsTable, fixturesTable } from "@workspace/db";
import {
  CreatePlayerBody,
  GetPlayerParams,
  UpdatePlayerParams,
  UpdatePlayerBody,
  DeletePlayerParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/players", async (_req, res): Promise<void> => {
  const players = await db.select().from(playersTable).orderBy(playersTable.name);
  res.json(players.map(p => ({
    id: p.id,
    name: p.name,
    position: p.position ?? null,
    createdAt: p.createdAt,
  })));
});

router.post("/players", async (req, res): Promise<void> => {
  const parsed = CreatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [player] = await db.insert(playersTable).values({
    name: parsed.data.name,
    position: parsed.data.position ?? null,
  }).returning();
  res.status(201).json({
    id: player.id,
    name: player.name,
    position: player.position ?? null,
    createdAt: player.createdAt,
  });
});

router.get("/players/:id", async (req, res): Promise<void> => {
  const params = GetPlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, params.data.id));
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const playerStats = await db
    .select({
      type: statsTable.type,
      count: sql<number>`count(*)::int`,
    })
    .from(statsTable)
    .where(eq(statsTable.playerId, player.id))
    .groupBy(statsTable.type);

  const totalGoals = playerStats.find(s => s.type === "goal")?.count ?? 0;
  const totalAssists = playerStats.find(s => s.type === "assist")?.count ?? 0;

  const playerAwards = await db
    .select({
      id: awardsTable.id,
      playerId: awardsTable.playerId,
      fixtureId: awardsTable.fixtureId,
      type: awardsTable.type,
      createdAt: awardsTable.createdAt,
      fixtureOpponent: fixturesTable.opponent,
    })
    .from(awardsTable)
    .innerJoin(fixturesTable, eq(awardsTable.fixtureId, fixturesTable.id))
    .where(eq(awardsTable.playerId, player.id))
    .orderBy(awardsTable.createdAt);

  const momCount = playerAwards.filter(a => a.type === "mom").length;
  const motmCount = playerAwards.filter(a => a.type === "motm").length;

  res.json({
    id: player.id,
    name: player.name,
    position: player.position ?? null,
    createdAt: player.createdAt,
    totalGoals,
    totalAssists,
    momCount,
    motmCount,
    awardHistory: playerAwards.map(a => ({
      id: a.id,
      playerId: a.playerId,
      playerName: player.name,
      fixtureId: a.fixtureId,
      fixtureOpponent: a.fixtureOpponent,
      type: a.type,
      createdAt: a.createdAt,
    })),
  });
});

router.put("/players/:id", async (req, res): Promise<void> => {
  const params = UpdatePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [player] = await db
    .update(playersTable)
    .set({ name: parsed.data.name, position: parsed.data.position ?? null })
    .where(eq(playersTable.id, params.data.id))
    .returning();
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json({ id: player.id, name: player.name, position: player.position ?? null, createdAt: player.createdAt });
});

router.delete("/players/:id", async (req, res): Promise<void> => {
  const params = DeletePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [player] = await db.delete(playersTable).where(eq(playersTable.id, params.data.id)).returning();
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
