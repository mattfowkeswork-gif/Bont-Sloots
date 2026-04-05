import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, playersTable, statsTable, awardsTable, fixturesTable, fixturePlayersTable, motmVotesTable, playerCommentsTable, playerRatingsTable } from "@workspace/db";
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
    scoutingProfile: p.scoutingProfile ?? null,
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
    scoutingProfile: parsed.data.scoutingProfile ?? null,
  }).returning();
  res.status(201).json({
    id: player.id,
    name: player.name,
    position: player.position ?? null,
    scoutingProfile: player.scoutingProfile ?? null,
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
    .select({ type: statsTable.type, count: sql<number>`count(*)::int` })
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

  // Apps (appearances)
  const [appsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(fixturePlayersTable)
    .where(eq(fixturePlayersTable.playerId, player.id));
  const apps = appsRow?.count ?? 0;

  // Fan MOTM votes won
  const [motmVotesRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(motmVotesTable)
    .where(eq(motmVotesTable.playerId, player.id));
  const motmVotes = motmVotesRow?.count ?? 0;

  const marketValue = 5_000_000
    + apps * 100_000
    + (totalGoals + totalAssists + motmVotes) * 500_000
    - motmCount * 1_000_000;

  // Recent form: last 3 appearances with per-game value delta
  const last3Apps = await db
    .select({ fixtureId: fixturePlayersTable.fixtureId, matchDate: fixturesTable.matchDate })
    .from(fixturePlayersTable)
    .innerJoin(fixturesTable, eq(fixturePlayersTable.fixtureId, fixturesTable.id))
    .where(eq(fixturePlayersTable.playerId, player.id))
    .orderBy(desc(fixturesTable.matchDate))
    .limit(3);

  const recentForm: number[] = [];
  for (const app of [...last3Apps].reverse()) {
    const [gRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(statsTable)
      .where(eq(statsTable.playerId, player.id));
    const [aRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(statsTable)
      .where(eq(statsTable.playerId, player.id));
    const [mRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(motmVotesTable)
      .where(eq(motmVotesTable.playerId, player.id));
    const [mupRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(awardsTable)
      .where(eq(awardsTable.playerId, player.id));

    // Simplified: just use appearance delta for now (full per-fixture stats computed in squad_stats)
    recentForm.push(100_000);
  }

  // Teammate comments
  const comments = await db
    .select()
    .from(playerCommentsTable)
    .where(eq(playerCommentsTable.playerId, player.id))
    .orderBy(playerCommentsTable.createdAt);

  // Average match rating across all rated fixtures
  const [avgRatingRow] = await db
    .select({ avg: sql<string>`round(avg(rating)::numeric, 1)` })
    .from(playerRatingsTable)
    .where(eq(playerRatingsTable.playerId, player.id));
  const avgRating = avgRatingRow?.avg ? parseFloat(avgRatingRow.avg) : null;

  res.json({
    id: player.id,
    name: player.name,
    position: player.position ?? null,
    scoutingProfile: player.scoutingProfile ?? null,
    createdAt: player.createdAt,
    totalGoals,
    totalAssists,
    momCount,
    motmCount,
    apps,
    marketValue,
    avgRating,
    recentForm,
    comments,
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
    .set({
      name: parsed.data.name,
      position: parsed.data.position ?? null,
      scoutingProfile: (parsed.data as any).scoutingProfile ?? null,
    })
    .where(eq(playersTable.id, params.data.id))
    .returning();
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  res.json({
    id: player.id,
    name: player.name,
    position: player.position ?? null,
    scoutingProfile: player.scoutingProfile ?? null,
    createdAt: player.createdAt,
  });
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
