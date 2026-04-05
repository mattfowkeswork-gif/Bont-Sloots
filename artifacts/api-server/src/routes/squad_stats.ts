import { Router, type IRouter } from "express";
import { eq, sql, and, inArray, desc, sum } from "drizzle-orm";
import {
  db, playersTable, statsTable, awardsTable, fixturePlayersTable,
  motmVotesTable, fixturesTable, playerRatingsTable, playerValueChangesTable,
} from "@workspace/db";

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
      playerId: p.id, playerName: p.name, position: p.position ?? null,
      scoutingProfile: p.scoutingProfile ?? null,
      apps: 0, goals: 0, assists: 0, motmVotes: 0, momAwards: 0, muppetAwards: 0,
      marketValue: 5_000_000, avgRating: null, recentForm: [], lastMatchChange: null, isKing: false,
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
    .where(eq(statsTable.type, "goal"))
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    goalsQuery = goalsQuery.where(and(eq(statsTable.type, "goal"), inArray(statsTable.fixtureId, seasonFixtureIds)) as any);
  }
  const goalCounts = await goalsQuery.groupBy(statsTable.playerId);

  // Assists
  let assistsQuery = db
    .select({ playerId: statsTable.playerId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .where(eq(statsTable.type, "assist"))
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    assistsQuery = assistsQuery.where(and(eq(statsTable.type, "assist"), inArray(statsTable.fixtureId, seasonFixtureIds)) as any);
  }
  const assistCounts = await assistsQuery.groupBy(statsTable.playerId);

  // MOTM fan votes
  let motmQuery = db
    .select({ playerId: motmVotesTable.playerId, count: sql<number>`count(*)::int` })
    .from(motmVotesTable)
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    motmQuery = motmQuery.where(inArray(motmVotesTable.fixtureId, seasonFixtureIds) as any);
  }
  const motmCounts = await motmQuery.groupBy(motmVotesTable.playerId);

  // Muppet awards
  let muppetQuery = db
    .select({ playerId: awardsTable.playerId, count: sql<number>`count(*)::int` })
    .from(awardsTable)
    .where(eq(awardsTable.type, "motm"))
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    muppetQuery = muppetQuery.where(and(eq(awardsTable.type, "motm"), inArray(awardsTable.fixtureId, seasonFixtureIds)) as any);
  }
  const muppetCounts = await muppetQuery.groupBy(awardsTable.playerId);

  // MOM awards
  let momQuery = db
    .select({ playerId: awardsTable.playerId, count: sql<number>`count(*)::int` })
    .from(awardsTable)
    .where(eq(awardsTable.type, "mom"))
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    momQuery = momQuery.where(and(eq(awardsTable.type, "mom"), inArray(awardsTable.fixtureId, seasonFixtureIds)) as any);
  }
  const momCounts = await momQuery.groupBy(awardsTable.playerId);

  // King of the Match award count
  let kingQuery = db
    .select({ playerId: awardsTable.playerId, count: sql<number>`count(*)::int` })
    .from(awardsTable)
    .where(eq(awardsTable.type, "king"))
    .$dynamic();
  if (seasonFixtureIds !== null && seasonFixtureIds.length > 0) {
    kingQuery = kingQuery.where(and(eq(awardsTable.type, "king"), inArray(awardsTable.fixtureId, seasonFixtureIds)) as any);
  }
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

  const result = players.map(p => {
    const apps = appsCounts.find(a => a.playerId === p.id)?.count ?? 0;
    const goals = goalCounts.find(g => g.playerId === p.id)?.count ?? 0;
    const assists = assistCounts.find(a => a.playerId === p.id)?.count ?? 0;
    const motmVotes = motmCounts.find(m => m.playerId === p.id)?.count ?? 0;
    const momAwards = momCounts.find(m => m.playerId === p.id)?.count ?? 0;
    const muppetAwards = muppetCounts.find(m => m.playerId === p.id)?.count ?? 0;
    const isKing = (kingCounts.find(k => k.playerId === p.id)?.count ?? 0) > 0;
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

    return {
      playerId: p.id,
      playerName: p.name,
      position: p.position ?? null,
      scoutingProfile: p.scoutingProfile ?? null,
      apps,
      goals,
      assists,
      motmVotes,
      momAwards,
      muppetAwards,
      marketValue,
      avgRating,
      recentForm,
      lastMatchChange,
      isKing,
    };
  });

  res.json(result);
});

export default router;
