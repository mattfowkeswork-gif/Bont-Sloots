import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, fixturesTable, statsTable, awardsTable, playersTable, motmVotesTable, settingsTable, playerValueChangesTable, fixturePlayersTable, playerXpBonusesTable } from "@workspace/db";
import { calculateXp } from "../lib/xp";
import { computeAchievements, computeComplexAchievements, totalAchievementXp, type PlayerMatchForAchievements } from "../lib/achievements";

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

  const [goalCounts, assistCounts, momCounts, motmCounts, fanMotmCounts, appsCounts, cleanSheetCounts] = await Promise.all([
    db.select({ playerId: statsTable.playerId, count: sql<number>`count(*)::int` })
      .from(statsTable).where(eq(statsTable.type, "goal")).groupBy(statsTable.playerId),
    db.select({ playerId: statsTable.playerId, count: sql<number>`count(*)::int` })
      .from(statsTable).where(eq(statsTable.type, "assist")).groupBy(statsTable.playerId),
    db.select({ playerId: awardsTable.playerId, count: sql<number>`count(*)::int` })
      .from(awardsTable).where(eq(awardsTable.type, "mom")).groupBy(awardsTable.playerId),
    db.select({ playerId: awardsTable.playerId, count: sql<number>`count(*)::int` })
      .from(awardsTable).where(eq(awardsTable.type, "motm")).groupBy(awardsTable.playerId),
    db.select({ playerId: motmVotesTable.playerId, count: sql<number>`count(*)::int` })
      .from(motmVotesTable).groupBy(motmVotesTable.playerId),
    db.select({ playerId: fixturePlayersTable.playerId, count: sql<number>`count(*)::int` })
      .from(fixturePlayersTable).where(eq(fixturePlayersTable.present, true)).groupBy(fixturePlayersTable.playerId),
    db.select({ playerId: statsTable.playerId, count: sql<number>`count(*)::int` })
      .from(statsTable).where(eq(statsTable.type, "clean_sheet")).groupBy(statsTable.playerId),
  ]);

  const allAppsWithDates = await db
    .select({ playerId: fixturePlayersTable.playerId, fixtureId: fixturePlayersTable.fixtureId, matchDate: fixturesTable.matchDate })
    .from(fixturePlayersTable)
    .innerJoin(fixturesTable, eq(fixturePlayersTable.fixtureId, fixturesTable.id))
    .where(eq(fixturePlayersTable.present, true));

  const allAwardsWithDates = await db
    .select({ playerId: awardsTable.playerId, fixtureId: awardsTable.fixtureId, type: awardsTable.type, matchDate: fixturesTable.matchDate })
    .from(awardsTable)
    .innerJoin(fixturesTable, eq(awardsTable.fixtureId, fixturesTable.id));

  const allXpBonuses = await db
    .select({ playerId: playerXpBonusesTable.playerId, amount: playerXpBonusesTable.amount })
    .from(playerXpBonusesTable);

  const playerStats = players.map(p => {
    const goals = goalCounts.find(g => g.playerId === p.id)?.count ?? 0;
    const assists = assistCounts.find(a => a.playerId === p.id)?.count ?? 0;
    const momCount = momCounts.find(m => m.playerId === p.id)?.count ?? 0;
    const motmCount = motmCounts.find(m => m.playerId === p.id)?.count ?? 0;
    const fanMotm = fanMotmCounts.find(m => m.playerId === p.id)?.count ?? 0;
    const apps = appsCounts.find(a => a.playerId === p.id)?.count ?? 0;
    const cleanSheets = cleanSheetCounts.find(c => c.playerId === p.id)?.count ?? 0;
    const playerApps = allAppsWithDates.filter(a => a.playerId === p.id);
    const playerAwards = allAwardsWithDates.filter(a => a.playerId === p.id);
    const momAwardFids = new Set(playerAwards.filter(a => a.type === "mom").map(a => a.fixtureId));
    const muppetAwardFids = new Set(playerAwards.filter(a => a.type === "motm").map(a => a.fixtureId));
    const matchDataForAchievements: PlayerMatchForAchievements[] = playerApps.map(app => ({
      fixtureId: app.fixtureId,
      matchDate: app.matchDate ?? new Date(0),
      goals,
      assists,
      cleanSheets,
      hasMomAward: momAwardFids.has(app.fixtureId),
      hasMuppetAward: muppetAwardFids.has(app.fixtureId),
    }));
    const baseXp = calculateXp({ apps, goals, assists, cleanSheets, momAwards: momCount, muppetAwards: motmCount, position: p.position });
    const achievements = computeAchievements({
      apps, goals, assists, cleanSheets, momAwards: momCount, muppetAwards: motmCount,
      baseLevel: baseXp.level,
      hatTrickCount: computeComplexAchievements(matchDataForAchievements).hatTrickCount,
      isPhoenix: computeComplexAchievements(matchDataForAchievements).isPhoenix,
      isJoker: computeComplexAchievements(matchDataForAchievements).isJoker,
      isGhost: computeComplexAchievements(matchDataForAchievements).isGhost,
      cleanSheetXpMultiplier: 1,
    });
    const achXp = totalAchievementXp(achievements);
    const manualXpBonus = allXpBonuses.filter(b => b.playerId === p.id).reduce((s, b) => s + b.amount, 0);
    const xp = calculateXp({ apps, goals, assists, cleanSheets, momAwards: momCount, muppetAwards: motmCount, position: p.position, achievementXp: achXp + manualXpBonus });
    const displayName = p.displayName ?? p.name;
    return {
      playerId: p.id,
      playerName: displayName,
      totalGoals: goals,
      totalAssists: assists,
      momCount,
      motmCount,
      fanMotm,
      totalXp: xp.totalXp,
      progressionXp: xp.progressionXp,
      level: xp.level,
    };
  });

  const topScorer = [...playerStats].sort((a, b) => b.totalGoals - a.totalGoals)[0] ?? null;
  const topLevel = [...playerStats].sort((a, b) => b.progressionXp - a.progressionXp)[0] ?? null;

  // Hall of Fame
  const mostMotmsPlayer = [...playerStats].sort((a, b) => b.fanMotm - a.fanMotm)[0] ?? null;
  const muppetKingPlayer = [...playerStats].sort((a, b) => b.motmCount - a.motmCount)[0] ?? null;
  const topRatedPlayer = [...playerStats].sort((a, b) => b.momCount - a.momCount)[0] ?? null;

  const hallOfFame = {
    topScorer: topScorer && topScorer.totalGoals > 0
      ? { playerId: topScorer.playerId, playerName: topScorer.playerName, value: topScorer.totalGoals }
      : null,
    topRated: topRatedPlayer && topRatedPlayer.momCount > 0
      ? { playerId: topRatedPlayer.playerId, playerName: topRatedPlayer.playerName, value: topRatedPlayer.momCount }
      : null,
    mostMotms: mostMotmsPlayer && mostMotmsPlayer.fanMotm > 0
      ? { playerId: mostMotmsPlayer.playerId, playerName: mostMotmsPlayer.playerName, value: mostMotmsPlayer.fanMotm }
      : null,
    muppetKing: muppetKingPlayer && muppetKingPlayer.motmCount > 0
      ? { playerId: muppetKingPlayer.playerId, playerName: muppetKingPlayer.playerName, value: muppetKingPlayer.motmCount }
      : null,
  };

  // Squad photo URL from settings
  const [squadPhotoSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, "squad_photo_url"));
  const squadPhotoUrl = squadPhotoSetting?.value ?? null;

  const serializeFixture = (f: typeof allFixtures[0]) => ({
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
    seasonId: f.seasonId ?? null,
    votingClosesAt: f.votingClosesAt?.toISOString() ?? null,
  });

  const now = new Date();
  const votingOpenFixture = [...playedFixtures]
    .reverse()
    .find(f => f.votingClosesAt && new Date(f.votingClosesAt) > now) ?? null;

  // Total squad market value = 5M per player + sum of all value changes
  const [valueSum] = await db
    .select({ total: sql<number>`coalesce(sum(${playerValueChangesTable.totalChange}), 0)::int` })
    .from(playerValueChangesTable);
  const totalSquadValue = players.length * 5_000_000 + (valueSum?.total ?? 0);

  res.json({
    nextFixture: nextFixture ? serializeFixture(nextFixture) : null,
    votingOpenFixture: votingOpenFixture ? serializeFixture(votingOpenFixture) : null,
    totalSquadValue,
    seasonRecord: { played: playedFixtures.length, wins, draws, losses, goalsFor, goalsAgainst },
    topScorer: topScorer && topScorer.totalGoals > 0 ? topScorer : null,
    topLevel: topLevel ? { playerId: topLevel.playerId, playerName: topLevel.playerName, level: topLevel.level, totalXp: topLevel.totalXp } : null,
    recentResults: recentResults.map(serializeFixture),
    hallOfFame,
    squadPhotoUrl,
  });
});

export default router;
