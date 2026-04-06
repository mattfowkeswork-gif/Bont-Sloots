import { Router, type IRouter } from "express";
import { eq, sql, desc, and } from "drizzle-orm";
import { calculateXp, isGkOrDef } from "../lib/xp";
import { recalculateFixtureValues } from "./value_calculator";
import {
  computeAchievements,
  computeComplexAchievements,
  totalAchievementXp,
  type PlayerMatchForAchievements,
} from "../lib/achievements";
import { db, playersTable, statsTable, awardsTable, fixturesTable, fixturePlayersTable, motmVotesTable, playerCommentsTable, playerRatingsTable, playerValueChangesTable } from "@workspace/db";
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
    displayName: p.displayName ?? null,
    position: p.position ?? null,
    scoutingProfile: p.scoutingProfile ?? null,
    photoUrl: p.photoUrl ?? null,
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
    displayName: parsed.data.displayName ?? null,
    position: parsed.data.position ?? null,
    scoutingProfile: parsed.data.scoutingProfile ?? null,
  }).returning();
  await db
    .insert(playerValueChangesTable)
    .values({
      playerId: player.id,
      fixtureId: 0,
      totalChange: 0,
      breakdown: [],
      isKing: false,
    })
    .onConflictDoNothing();
  await recalculateFixtureValues();
  res.status(201).json({
    id: player.id,
    name: player.name,
    displayName: player.displayName ?? null,
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
  const totalCleanSheets = playerStats.find(s => s.type === "clean_sheet")?.count ?? 0;

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

  // Market value from player_value_changes table (base £5M + sum of all changes)
  const allValueChanges = await db
    .select({
      fixtureId: playerValueChangesTable.fixtureId,
      totalChange: playerValueChangesTable.totalChange,
      breakdown: playerValueChangesTable.breakdown,
      isKing: playerValueChangesTable.isKing,
      matchDate: fixturesTable.matchDate,
    })
    .from(playerValueChangesTable)
    .innerJoin(fixturesTable, eq(fixturesTable.id, playerValueChangesTable.fixtureId))
    .where(eq(playerValueChangesTable.playerId, player.id))
    .orderBy(desc(fixturesTable.matchDate));

  const totalValueChange = allValueChanges.reduce((sum, r) => sum + (r.totalChange ?? 0), 0);
  const marketValue = 5_000_000 + totalValueChange;

  // Build value change map keyed by fixtureId for quick lookup
  const valueChangeMap = new Map<number, { totalChange: number; breakdown: any[]; isKing: boolean }>();
  for (const vc of allValueChanges) {
    valueChangeMap.set(vc.fixtureId, {
      totalChange: vc.totalChange ?? 0,
      breakdown: (vc.breakdown as any[]) ?? [],
      isKing: vc.isKing ?? false,
    });
  }

  // Recent form: last 3 value changes (oldest-first) for sparkline
  const recentForm = [...allValueChanges]
    .slice(0, 3)
    .reverse()
    .map(vc => vc.totalChange ?? 0);

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

  // Full match history: all appearances with fixture info, rating, goals, assists
  const allApps = await db
    .select({
      fixtureId: fixturePlayersTable.fixtureId,
      opponent: fixturesTable.opponent,
      matchDate: fixturesTable.matchDate,
      homeScore: fixturesTable.homeScore,
      awayScore: fixturesTable.awayScore,
      isHome: fixturesTable.isHome,
    })
    .from(fixturePlayersTable)
    .innerJoin(fixturesTable, eq(fixturePlayersTable.fixtureId, fixturesTable.id))
    .where(and(eq(fixturePlayersTable.playerId, player.id), eq(fixturePlayersTable.present, true)))
    .orderBy(desc(fixturesTable.matchDate));

  const matchRatings = await db
    .select({ fixtureId: playerRatingsTable.fixtureId, rating: playerRatingsTable.rating })
    .from(playerRatingsTable)
    .where(eq(playerRatingsTable.playerId, player.id));

  const goalsPerApp = await db
    .select({ fixtureId: statsTable.fixtureId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .where(and(eq(statsTable.playerId, player.id), eq(statsTable.type, "goal")))
    .groupBy(statsTable.fixtureId);

  const assistsPerApp = await db
    .select({ fixtureId: statsTable.fixtureId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .where(and(eq(statsTable.playerId, player.id), eq(statsTable.type, "assist")))
    .groupBy(statsTable.fixtureId);

  const cleanSheetsPerApp = await db
    .select({ fixtureId: statsTable.fixtureId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .where(and(eq(statsTable.playerId, player.id), eq(statsTable.type, "clean_sheet")))
    .groupBy(statsTable.fixtureId);

  // Build per-match data for achievement computation
  const momAwardFixtureIds = new Set(playerAwards.filter(a => a.type === "mom").map(a => a.fixtureId));
  const muppetAwardFixtureIds = new Set(playerAwards.filter(a => a.type === "motm").map(a => a.fixtureId));

  const matchDataForAchievements: PlayerMatchForAchievements[] = allApps.map(app => ({
    fixtureId: app.fixtureId,
    matchDate: app.matchDate ?? new Date(0),
    goals: goalsPerApp.find(g => g.fixtureId === app.fixtureId)?.count ?? 0,
    assists: assistsPerApp.find(a => a.fixtureId === app.fixtureId)?.count ?? 0,
    cleanSheets: cleanSheetsPerApp.find(c => c.fixtureId === app.fixtureId)?.count ?? 0,
    hasMomAward: momAwardFixtureIds.has(app.fixtureId),
    hasMuppetAward: muppetAwardFixtureIds.has(app.fixtureId),
  }));

  const matchHistory = allApps.map(app => {
    const vc = valueChangeMap.get(app.fixtureId);
    return {
      fixtureId: app.fixtureId,
      opponent: app.opponent,
      matchDate: app.matchDate,
      homeScore: app.homeScore,
      awayScore: app.awayScore,
      isHome: app.isHome,
      rating: matchRatings.find(r => r.fixtureId === app.fixtureId)?.rating ?? null,
      goals: goalsPerApp.find(g => g.fixtureId === app.fixtureId)?.count ?? 0,
      assists: assistsPerApp.find(a => a.fixtureId === app.fixtureId)?.count ?? 0,
      valueChange: vc?.totalChange ?? null,
      valueBreakdown: vc?.breakdown ?? null,
      isKing: vc?.isKing ?? false,
    };
  });

  // Determine if this player is the current muppet (most recent muppet award belongs to this player)
  const [latestMuppet] = await db
    .select({ playerId: awardsTable.playerId })
    .from(awardsTable)
    .where(eq(awardsTable.type, "motm"))
    .orderBy(desc(awardsTable.createdAt))
    .limit(1);
  const isMuppet = latestMuppet?.playerId === player.id;

  // Compute achievements (two-pass: base level first, then with achievement XP)
  const position = player.position ?? null;
  const csMultiplier = isGkOrDef(position) ? 1 : 0.25;
  const baseXp = calculateXp({ apps, goals: totalGoals, assists: totalAssists, cleanSheets: totalCleanSheets, momAwards: momCount, muppetAwards: motmCount, position });
  const complex = computeComplexAchievements(matchDataForAchievements);
  const achievements = computeAchievements({
    apps, goals: totalGoals, assists: totalAssists, cleanSheets: totalCleanSheets,
    momAwards: momCount, muppetAwards: motmCount,
    baseLevel: baseXp.level,
    hatTrickCount: complex.hatTrickCount,
    isPhoenix: complex.isPhoenix,
    isJoker: complex.isJoker,
    isGhost: complex.isGhost,
    cleanSheetXpMultiplier: csMultiplier,
  });
  const achXp = totalAchievementXp(achievements);

  const xp = calculateXp({
    apps, goals: totalGoals, assists: totalAssists, cleanSheets: totalCleanSheets,
    momAwards: momCount, muppetAwards: motmCount, position, achievementXp: achXp,
  });

  res.json({
    id: player.id,
    name: player.name,
    displayName: player.displayName ?? null,
    position: player.position ?? null,
    scoutingProfile: player.scoutingProfile ?? null,
    photoUrl: player.photoUrl ?? null,
    isMuppet,
    createdAt: player.createdAt,
    totalGoals,
    totalAssists,
    totalCleanSheets,
    momCount,
    motmCount,
    apps,
    marketValue,
    avgRating,
    recentForm,
    matchHistory,
    comments,
    totalXp: xp.totalXp,
    progressionXp: xp.progressionXp,
    level: xp.level,
    xpIntoLevel: xp.xpIntoLevel,
    xpForNextLevel: xp.xpForNextLevel,
    xpBreakdown: xp.xpBreakdown,
    achievementXp: achXp,
    achievements,
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
      displayName: parsed.data.displayName ?? null,
      position: parsed.data.position ?? null,
      scoutingProfile: (parsed.data as any).scoutingProfile ?? null,
    })
    .where(eq(playersTable.id, params.data.id))
    .returning();
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }
  await db
    .insert(playerValueChangesTable)
    .values({
      playerId: player.id,
      fixtureId: 0,
      totalChange: 0,
      breakdown: [],
      isKing: false,
    })
    .onConflictDoNothing();
  await recalculateFixtureValues();
  res.json({
    id: player.id,
    name: player.name,
    displayName: player.displayName ?? null,
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
