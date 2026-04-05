import { Router, type IRouter } from "express";
import { gte, lte, eq, sql, desc } from "drizzle-orm";
import { db, fixturesTable, statsTable, awardsTable, playersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const allFixtures = await db.select().from(fixturesTable).orderBy(fixturesTable.matchDate);

  const upcomingFixtures = allFixtures.filter(f => !f.played && f.matchDate >= today);
  const nextFixture = upcomingFixtures[0] ?? null;

  const playedFixtures = allFixtures.filter(f => f.played && f.homeScore != null && f.awayScore != null);
  const recentResults = playedFixtures.slice(-5).reverse();

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const f of playedFixtures) {
    const hs = f.homeScore ?? 0;
    const as_ = f.awayScore ?? 0;
    if (f.isHome) {
      goalsFor += hs;
      goalsAgainst += as_;
      if (hs > as_) wins++;
      else if (hs === as_) draws++;
      else losses++;
    } else {
      goalsFor += as_;
      goalsAgainst += hs;
      if (as_ > hs) wins++;
      else if (as_ === hs) draws++;
      else losses++;
    }
  }

  const players = await db.select().from(playersTable).orderBy(playersTable.name);

  const goalCounts = await db
    .select({ playerId: statsTable.playerId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .where(eq(statsTable.type, "goal"))
    .groupBy(statsTable.playerId);

  const assistCounts = await db
    .select({ playerId: statsTable.playerId, count: sql<number>`count(*)::int` })
    .from(statsTable)
    .where(eq(statsTable.type, "assist"))
    .groupBy(statsTable.playerId);

  const momCounts = await db
    .select({ playerId: awardsTable.playerId, count: sql<number>`count(*)::int` })
    .from(awardsTable)
    .where(eq(awardsTable.type, "mom"))
    .groupBy(awardsTable.playerId);

  const motmCounts = await db
    .select({ playerId: awardsTable.playerId, count: sql<number>`count(*)::int` })
    .from(awardsTable)
    .where(eq(awardsTable.type, "motm"))
    .groupBy(awardsTable.playerId);

  const playerStats = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    totalGoals: goalCounts.find(g => g.playerId === p.id)?.count ?? 0,
    totalAssists: assistCounts.find(a => a.playerId === p.id)?.count ?? 0,
    momCount: momCounts.find(m => m.playerId === p.id)?.count ?? 0,
    motmCount: motmCounts.find(m => m.playerId === p.id)?.count ?? 0,
  }));

  const topScorer = playerStats.sort((a, b) => b.totalGoals - a.totalGoals)[0] ?? null;

  res.json({
    nextFixture: nextFixture ? {
      id: nextFixture.id,
      opponent: nextFixture.opponent,
      matchDate: nextFixture.matchDate,
      kickoffTime: nextFixture.kickoffTime ?? null,
      kickoffTbc: nextFixture.kickoffTbc,
      homeScore: nextFixture.homeScore ?? null,
      awayScore: nextFixture.awayScore ?? null,
      played: nextFixture.played,
      isHome: nextFixture.isHome,
      venue: nextFixture.venue ?? null,
      notes: nextFixture.notes ?? null,
    } : null,
    seasonRecord: {
      played: playedFixtures.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
    },
    topScorer: topScorer && topScorer.totalGoals > 0 ? topScorer : null,
    recentResults: recentResults.map(f => ({
      id: f.id,
      opponent: f.opponent,
      matchDate: f.matchDate,
      kickoffTime: f.kickoffTime ?? null,
      kickoffTbc: f.kickoffTbc,
      homeScore: f.homeScore ?? null,
      awayScore: f.awayScore ?? null,
      played: f.played,
      isHome: f.isHome,
      venue: f.venue ?? null,
      notes: f.notes ?? null,
    })),
  });
});

export default router;
