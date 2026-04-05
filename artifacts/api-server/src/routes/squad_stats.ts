import { Router, type IRouter } from "express";
import { eq, sql, and, inArray, desc } from "drizzle-orm";
import { db, playersTable, statsTable, awardsTable, fixturePlayersTable, motmVotesTable, fixturesTable, playerRatingsTable } from "@workspace/db";

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
      apps: 0, goals: 0, assists: 0, motmVotes: 0, muppetAwards: 0, marketValue: 5000000,
      avgRating: null, recentForm: [],
    }));
    res.json(result);
    return;
  }

  // Apps (appearances) from fixture_players
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

  // MOTM votes (fan votes)
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

  // Average match rating per player
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

  // Recent form: per-player last 3 appearances with stat deltas
  const allAppearances = await db
    .select({
      playerId: fixturePlayersTable.playerId,
      fixtureId: fixturePlayersTable.fixtureId,
      matchDate: fixturesTable.matchDate,
    })
    .from(fixturePlayersTable)
    .innerJoin(fixturesTable, eq(fixturePlayersTable.fixtureId, fixturesTable.id))
    .where(eq(fixturePlayersTable.present, true))
    .orderBy(desc(fixturesTable.matchDate));

  const goalsPerFixture = await db
    .select({ playerId: statsTable.playerId, fixtureId: statsTable.fixtureId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .where(eq(statsTable.type, "goal"))
    .groupBy(statsTable.playerId, statsTable.fixtureId);

  const assistsPerFixture = await db
    .select({ playerId: statsTable.playerId, fixtureId: statsTable.fixtureId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .where(eq(statsTable.type, "assist"))
    .groupBy(statsTable.playerId, statsTable.fixtureId);

  const motmPerFixture = await db
    .select({ playerId: motmVotesTable.playerId, fixtureId: motmVotesTable.fixtureId, count: sql<number>`count(*)::int` })
    .from(motmVotesTable)
    .groupBy(motmVotesTable.playerId, motmVotesTable.fixtureId);

  const muppetPerFixture = await db
    .select({ playerId: awardsTable.playerId, fixtureId: awardsTable.fixtureId, count: sql<number>`count(*)::int` })
    .from(awardsTable)
    .where(eq(awardsTable.type, "motm"))
    .groupBy(awardsTable.playerId, awardsTable.fixtureId);

  const result = players.map(p => {
    const apps = appsCounts.find(a => a.playerId === p.id)?.count ?? 0;
    const goals = goalCounts.find(g => g.playerId === p.id)?.count ?? 0;
    const assists = assistCounts.find(a => a.playerId === p.id)?.count ?? 0;
    const motmVotes = motmCounts.find(m => m.playerId === p.id)?.count ?? 0;
    const muppetAwards = muppetCounts.find(m => m.playerId === p.id)?.count ?? 0;
    const avgRatingRaw = avgRatings.find(r => r.playerId === p.id)?.avg;
    const avgRating = avgRatingRaw ? parseFloat(avgRatingRaw) : null;

    const marketValue = 5_000_000
      + apps * 100_000
      + (goals + assists + motmVotes) * 500_000
      - muppetAwards * 1_000_000;

    const playerApps = allAppearances
      .filter(a => a.playerId === p.id)
      .slice(0, 3)
      .reverse();

    const recentForm = playerApps.map(app => {
      const g = goalsPerFixture.find(x => x.playerId === p.id && x.fixtureId === app.fixtureId)?.count ?? 0;
      const a = assistsPerFixture.find(x => x.playerId === p.id && x.fixtureId === app.fixtureId)?.count ?? 0;
      const m = motmPerFixture.find(x => x.playerId === p.id && x.fixtureId === app.fixtureId)?.count ?? 0;
      const mup = muppetPerFixture.find(x => x.playerId === p.id && x.fixtureId === app.fixtureId)?.count ?? 0;
      return 100_000 + g * 500_000 + a * 500_000 + m * 500_000 - mup * 1_000_000;
    });

    return {
      playerId: p.id,
      playerName: p.name,
      position: p.position ?? null,
      scoutingProfile: p.scoutingProfile ?? null,
      apps,
      goals,
      assists,
      motmVotes,
      muppetAwards,
      marketValue,
      avgRating,
      recentForm,
    };
  });

  res.json(result);
});

export default router;
