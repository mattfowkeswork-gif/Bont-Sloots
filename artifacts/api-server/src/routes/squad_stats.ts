import { Router, type IRouter } from "express";
import { eq, sql, and, inArray, desc, sum } from "drizzle-orm";
import {
  db, playersTable, statsTable, awardsTable, fixturePlayersTable,
  motmVotesTable, fixturesTable, playerRatingsTable, playerValueChangesTable,
  playerXpBonusesTable,
} from "@workspace/db";
import { calculateXp, isGkOrDef } from "../lib/xp";
import { computeAchievements, computeComplexAchievements, totalAchievementXp, type PlayerMatchForAchievements } from "../lib/achievements";

const router: IRouter = Router();

router.get("/squad-stats", async (req, res): Promise<void> => {
  const seasonId = req.query.seasonId ? parseInt(req.query.seasonId as string) : null;

  const players = await db.select().from(playersTable).orderBy(playersTable.name);

  // Get fixture IDs in season if filtering
  let seasonFixtureIds: number[] | null = null;
  if (seasonId) {
    const fixtures = await db
      .select({ id: fixturesTable.id })
      .from(fixturesTable)
      .where(eq(fixturesTable.seasonId, seasonId));
    seasonFixtureIds = fixtures.map(f => f.id);
  }

  // Short-circuit when season has no fixtures
  if (seasonFixtureIds !== null && seasonFixtureIds.length === 0) {
    const result = players.map(p => ({
      playerId: p.id, playerName: p.name, displayName: p.displayName ?? null, position: p.position ?? null,
      scoutingProfile: p.scoutingProfile ?? null, photoUrl: p.photoUrl ?? null,
      apps: 0, goals: 0, assists: 0, motmVotes: 0, momAwards: 0, muppetAwards: 0,
      marketValue: 5_000_000, avgRating: null, recentForm: [], lastMatchChange: null, isKing: false, isMuppet: false,
    }));
    res.json(result);
    return;
  }

  // Apps
  let appsQuery = db
    .select({ playerId: fixturePlayersTable.playerId, count: sql<number>`count(*)::int` })
    .from(fixturePlayersTable)
    .where(eq(fixturePlayersTable.present, true))
    .$dynamic();
  if (seasonFixtureIds !== null) {
    appsQuery = appsQuery.where(and(
      eq(fixturePlayersTable.present, true),
      inArray(fixturePlayersTable.fixtureId, seasonFixtureIds)
    ) as any);
  }
  const appsCounts = await appsQuery.groupBy(fixturePlayersTable.playerId);

  // Goals
  let goalsQuery = db
    .select({ playerId: statsTable.playerId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(statsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(statsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(eq(statsTable.type, "goal"), eq(fixturePlayersTable.present, true)))
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    goalsQuery = goalsQuery.where(and(eq(statsTable.type, "goal"), inArray(statsTable.fixtureId, seasonFixtureIds)) as any);
  }
  const goalCounts = await goalsQuery.groupBy(statsTable.playerId);

  // Assists
  let assistsQuery = db
    .select({ playerId: statsTable.playerId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(statsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(statsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(eq(statsTable.type, "assist"), eq(fixturePlayersTable.present, true)))
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    assistsQuery = assistsQuery.where(and(eq(statsTable.type, "assist"), inArray(statsTable.fixtureId, seasonFixtureIds)) as any);
  }
  const assistCounts = await assistsQuery.groupBy(statsTable.playerId);

  // Clean sheets
  let cleanSheetsQuery = db
    .select({ playerId: statsTable.playerId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(statsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(statsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(eq(statsTable.type, "clean_sheet"), eq(fixturePlayersTable.present, true)))
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    cleanSheetsQuery = cleanSheetsQuery.where(and(eq(statsTable.type, "clean_sheet"), inArray(statsTable.fixtureId, seasonFixtureIds)) as any);
  }
  const cleanSheetCounts = await cleanSheetsQuery.groupBy(statsTable.playerId);

  // Emergency GK
  let emergencyGkQuery = db
    .select({ playerId: statsTable.playerId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(statsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(statsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(eq(statsTable.type, "emergency_gk"), eq(fixturePlayersTable.present, true)))
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    emergencyGkQuery = emergencyGkQuery.where(and(eq(statsTable.type, "emergency_gk"), inArray(statsTable.fixtureId, seasonFixtureIds)) as any);
  }
  const emergencyGkCounts = await emergencyGkQuery.groupBy(statsTable.playerId);

  // MOTM fan votes
const allFanMotmVotes = await db
  .select({
    fixtureId: motmVotesTable.fixtureId,
    playerId: motmVotesTable.playerId,
    votes: sql<number>`count(*)::int`,
  })
  .from(motmVotesTable)
  .groupBy(motmVotesTable.fixtureId, motmVotesTable.playerId);

  // Muppet awards
  let muppetQuery = db
    .select({ playerId: awardsTable.playerId, count: sql<number>`count(*)::int` })
    .from(awardsTable)
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(awardsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(awardsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(
      eq(awardsTable.type, "motm"),
      eq(fixturePlayersTable.present, true),
      ...(seasonFixtureIds !== null && seasonFixtureIds.length > 0 ? [inArray(awardsTable.fixtureId, seasonFixtureIds)] : [])
    ) as any)
    .$dynamic();
  const muppetCounts = await muppetQuery.groupBy(awardsTable.playerId);

  // MOM awards
  let momQuery = db
    .select({ playerId: awardsTable.playerId, count: sql<number>`count(*)::int` })
    .from(awardsTable)
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(awardsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(awardsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(
      eq(awardsTable.type, "mom"),
      eq(fixturePlayersTable.present, true),
      ...(seasonFixtureIds !== null && seasonFixtureIds.length > 0 ? [inArray(awardsTable.fixtureId, seasonFixtureIds)] : [])
    ) as any)
    .$dynamic();
  const momCounts = await momQuery.groupBy(awardsTable.playerId);

  // King of the Match award count
  let kingQuery = db
    .select({ playerId: awardsTable.playerId, count: sql<number>`count(*)::int` })
    .from(awardsTable)
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(awardsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(awardsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(
      eq(awardsTable.type, "king"),
      eq(fixturePlayersTable.present, true),
      ...(seasonFixtureIds !== null && seasonFixtureIds.length > 0 ? [inArray(awardsTable.fixtureId, seasonFixtureIds)] : [])
    ) as any)
    .$dynamic();
  const kingCounts = await kingQuery.groupBy(awardsTable.playerId);

  // Average match rating
  let avgRatingQuery = db
    .select({
      playerId: playerRatingsTable.playerId,
      avg: sql<string>`round(avg(${playerRatingsTable.rating})::numeric, 1)`,
    })
    .from(playerRatingsTable)
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    avgRatingQuery = avgRatingQuery.where(inArray(playerRatingsTable.fixtureId, seasonFixtureIds) as any);
  }
  const avgRatings = await avgRatingQuery.groupBy(playerRatingsTable.playerId);

  // Market value from player_value_changes: sum totalChange per player
  let valueQuery = db
    .select({
      playerId: playerValueChangesTable.playerId,
      totalValue: sql<number>`coalesce(sum(${playerValueChangesTable.totalChange}), 0)::int`,
    })
    .from(playerValueChangesTable)
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    valueQuery = valueQuery.where(inArray(playerValueChangesTable.fixtureId, seasonFixtureIds) as any);
  }
  const valueTotals = await valueQuery.groupBy(playerValueChangesTable.playerId);

  // --- Achievement batch queries ---
  const seasonFilter =
    seasonFixtureIds !== null && seasonFixtureIds.length > 0
      ? inArray(statsTable.fixtureId, seasonFixtureIds)
      : undefined;

  // Per-fixture goal counts per player (hat-tricks)
  let goalsPerFixtureQuery = db
    .select({ playerId: statsTable.playerId, fixtureId: statsTable.fixtureId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(statsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(statsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(
      eq(statsTable.type, "goal"),
      eq(fixturePlayersTable.present, true),
      ...(seasonFilter ? [seasonFilter] : [])
    ) as any)
    .$dynamic();
  const goalsPerFixtureAll = await goalsPerFixtureQuery.groupBy(statsTable.playerId, statsTable.fixtureId);

  // Per-fixture assist counts per player (Joker)
  let assistsPerFixtureQuery = db
    .select({ playerId: statsTable.playerId, fixtureId: statsTable.fixtureId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(statsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(statsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(
      eq(statsTable.type, "assist"),
      eq(fixturePlayersTable.present, true),
      ...(seasonFilter ? [seasonFilter] : [])
    ) as any)
    .$dynamic();
  const assistsPerFixtureAll = await assistsPerFixtureQuery.groupBy(statsTable.playerId, statsTable.fixtureId);

  // Per-fixture clean sheet counts per player (Ghost)
  let cleanSheetsPerFixtureQuery = db
    .select({ playerId: statsTable.playerId, fixtureId: statsTable.fixtureId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(statsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(statsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(
      eq(statsTable.type, "clean_sheet"),
      eq(fixturePlayersTable.present, true),
      ...(seasonFilter ? [seasonFilter] : [])
    ) as any)
    .$dynamic();
  const cleanSheetsPerFixtureAll = await cleanSheetsPerFixtureQuery.groupBy(statsTable.playerId, statsTable.fixtureId);

  // All appearances with fixture dates (Ghost, Phoenix)
  let allAppsWithDatesQuery = db
    .select({ playerId: fixturePlayersTable.playerId, fixtureId: fixturePlayersTable.fixtureId, matchDate: fixturesTable.matchDate })
    .from(fixturePlayersTable)
    .innerJoin(fixturesTable, eq(fixturePlayersTable.fixtureId, fixturesTable.id))
    .where(and(
      eq(fixturePlayersTable.present, true),
      ...(seasonFixtureIds !== null && seasonFixtureIds.length > 0 ? [inArray(fixturePlayersTable.fixtureId, seasonFixtureIds)] : [])
    ) as any)
    .$dynamic();
  const allAppsWithDates = await allAppsWithDatesQuery;

  // Awards with fixture dates (Phoenix, Joker)
  let allAwardsWithDatesQuery = db
    .select({ playerId: awardsTable.playerId, fixtureId: awardsTable.fixtureId, type: awardsTable.type, matchDate: fixturesTable.matchDate })
    .from(awardsTable)
    .innerJoin(fixturesTable, eq(awardsTable.fixtureId, fixturesTable.id))
    .innerJoin(
      fixturePlayersTable,
      and(
        eq(awardsTable.fixtureId, fixturePlayersTable.fixtureId),
        eq(awardsTable.playerId, fixturePlayersTable.playerId)
      )
    )
    .where(and(
      eq(fixturePlayersTable.present, true),
      ...(seasonFixtureIds !== null && seasonFixtureIds.length > 0 ? [inArray(awardsTable.fixtureId, seasonFixtureIds)] : [])
    ) as any)
    .$dynamic();
  const allAwardsWithDates = await allAwardsWithDatesQuery;
  // --- End achievement batch queries ---

  // Recent form: last 3 match value changes per player (from player_value_changes, joined with fixtures for date)
  const allValueChanges = await db
    .select({
      playerId: playerValueChangesTable.playerId,
      fixtureId: playerValueChangesTable.fixtureId,
      totalChange: playerValueChangesTable.totalChange,
      matchDate: fixturesTable.matchDate,
    })
    .from(playerValueChangesTable)
    .innerJoin(fixturesTable, eq(playerValueChangesTable.fixtureId, fixturesTable.id))
    .orderBy(desc(fixturesTable.matchDate));

  // Manual XP bonuses (all players, not season-filtered)
  const allXpBonuses = await db
    .select({ playerId: playerXpBonusesTable.playerId, amount: playerXpBonusesTable.amount })
    .from(playerXpBonusesTable);

  // Determine the current muppet: player who received the most recent "motm" award
  const [latestMuppet] = await db
    .select({ playerId: awardsTable.playerId })
    .from(awardsTable)
    .where(eq(awardsTable.type, "motm"))
    .orderBy(desc(awardsTable.createdAt))
    .limit(1);
  const currentMuppetPlayerId = latestMuppet?.playerId ?? null;

  const result = players.map(p => {
    const apps = appsCounts.find(a => a.playerId === p.id)?.count ?? 0;
    const goals = goalCounts.find(g => g.playerId === p.id)?.count ?? 0;
    const assists = assistCounts.find(a => a.playerId === p.id)?.count ?? 0;
    const cleanSheets = cleanSheetCounts.find(c => c.playerId === p.id)?.count ?? 0;
    const emergencyGk = emergencyGkCounts.find(e => e.playerId === p.id)?.count ?? 0;
    const motmVotes = allFanMotmVotes.reduce((wins, row, _idx, allRows) => {
  if (row.playerId !== p.id) return wins;

  const rowsForFixture = allRows.filter(r => r.fixtureId === row.fixtureId);
  const maxVotes = Math.max(...rowsForFixture.map(r => r.votes));

  if (row.votes === maxVotes) return wins + 1;
  return wins;
}, 0);
    const momAwards = momCounts.find(m => m.playerId === p.id)?.count ?? 0;
    const muppetAwards = muppetCounts.find(m => m.playerId === p.id)?.count ?? 0;
    const isKing = (kingCounts.find(k => k.playerId === p.id)?.count ?? 0) > 0;
    const isMuppet = currentMuppetPlayerId === p.id;
    const avgRatingRaw = avgRatings.find(r => r.playerId === p.id)?.avg;
    const avgRating = avgRatingRaw ? parseFloat(avgRatingRaw) : null;

    const earnedValue = valueTotals.find(v => v.playerId === p.id)?.totalValue ?? 0;
    const marketValue = 5_000_000 + earnedValue;

    // Recent form: last 3 changes ordered newest-first, then reverse for sparkline (oldest→newest)
    const playerChanges = allValueChanges
      .filter(vc => vc.playerId === p.id)
      .slice(0, 3)
      .reverse();
    const recentForm = playerChanges.map(vc => vc.totalChange);

    const lastMatchChange = allValueChanges.find(vc => vc.playerId === p.id)?.totalChange ?? null;

    // Build per-match data for this player's achievements
    const playerApps = allAppsWithDates.filter(a => a.playerId === p.id);
    const playerGoalsPerFixture = goalsPerFixtureAll.filter(g => g.playerId === p.id);
    const playerAssistsPerFixture = assistsPerFixtureAll.filter(a => a.playerId === p.id);
    const playerCleanSheetsPerFixture = cleanSheetsPerFixtureAll.filter(c => c.playerId === p.id);
    const playerAwardsForAch = allAwardsWithDates.filter(a => a.playerId === p.id);
    const momAwardFids = new Set(playerAwardsForAch.filter(a => a.type === "mom").map(a => a.fixtureId));
    const muppetAwardFids = new Set(playerAwardsForAch.filter(a => a.type === "motm").map(a => a.fixtureId));

    const matchDataForAch: PlayerMatchForAchievements[] = playerApps.map(app => ({
      fixtureId: app.fixtureId,
      matchDate: app.matchDate ?? new Date(0),
      goals: playerGoalsPerFixture.find(g => g.fixtureId === app.fixtureId)?.count ?? 0,
      assists: playerAssistsPerFixture.find(a => a.fixtureId === app.fixtureId)?.count ?? 0,
      cleanSheets: playerCleanSheetsPerFixture.find(c => c.fixtureId === app.fixtureId)?.count ?? 0,
      hasMomAward: momAwardFids.has(app.fixtureId),
      hasMuppetAward: muppetAwardFids.has(app.fixtureId),
    }));

    const position = p.position ?? null;
    const csMultiplier = isGkOrDef(position) ? 1 : 0.25;
    const manualXpBonus = allXpBonuses.filter(b => b.playerId === p.id).reduce((s, b) => s + b.amount, 0);
    const baseXp = calculateXp({ apps, goals, assists, cleanSheets, momAwards, muppetAwards, position, achievementXp: manualXpBonus });
    const complex = computeComplexAchievements(matchDataForAch);
    const playerAchievements = computeAchievements({
      apps, goals, assists, cleanSheets, momAwards, muppetAwards,
      baseLevel: baseXp.level,
      hatTrickCount: complex.hatTrickCount,
      isPhoenix: complex.isPhoenix,
      isJoker: complex.isJoker,
      isGhost: complex.isGhost,
      cleanSheetXpMultiplier: csMultiplier,
      emergencyGkCount: emergencyGk,
    });
    const achXp = totalAchievementXp(playerAchievements);
    const xp = calculateXp({ apps, goals, assists, cleanSheets, momAwards, muppetAwards, position, achievementXp: achXp + manualXpBonus });

    return {
      playerId: p.id,
      playerName: p.name,
      displayName: p.displayName ?? null,
      position: p.position ?? null,
      scoutingProfile: p.scoutingProfile ?? null,
      photoUrl: p.photoUrl ?? null,
      apps,
      goals,
      assists,
      cleanSheets,
      motmVotes,
      momAwards,
      muppetAwards,
      marketValue,
      avgRating,
      recentForm,
      lastMatchChange,
      isKing,
      isMuppet,
      totalXp: xp.totalXp,
      progressionXp: xp.progressionXp,
      level: xp.level,
      xpIntoLevel: xp.xpIntoLevel,
      xpForNextLevel: xp.xpForNextLevel,
      xpBreakdown: xp.xpBreakdown,
      achievementXp: achXp,
      achievementCount: playerAchievements.filter(a => a.earned).length,
    };
  });

  res.json(result);
});

export default router;
