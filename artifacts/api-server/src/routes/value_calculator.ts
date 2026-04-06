import { eq, inArray, and, sql } from "drizzle-orm";
import {
  db, fixturesTable, fixturePlayersTable, statsTable, playerRatingsTable,
  awardsTable, motmVotesTable, playersTable, playerValueChangesTable,
} from "@workspace/db";

function isDefOrGk(position: string | null | undefined): boolean {
  return position === "GK" || position === "DEF";
}

function getRatingBonus(rating: number | null): { amount: number; label: string } | null {
  if (rating === null) return null;
  if (rating >= 9.0) return { amount: 750_000, label: `Rating ${rating} — Elite` };
  if (rating >= 7.5) return { amount: 250_000, label: `Rating ${rating} — Good` };
  if (rating >= 5.5 && rating <= 6.5) return { amount: -250_000, label: `Rating ${rating} — Poor` };
  if (rating < 5.0) return { amount: -750_000, label: `Rating ${rating} — Shocker` };
  return null;
}

function getDefBonus(conceded: number): { amount: number; label: string } {
  if (conceded === 0) return { amount: 1_000_000, label: "Clean Sheet" };
  if (conceded <= 2) return { amount: 500_000, label: `Elite Defence (${conceded} conceded)` };
  if (conceded <= 5) return { amount: 0, label: `Dead Zone (${conceded} conceded)` };
  if (conceded <= 9) return { amount: -500_000, label: `Defensive Collapse (${conceded} conceded)` };
  return { amount: -1_500_000, label: `Sunday League Nightmare (${conceded} conceded)` };
}

export async function recalculateFixtureValues(fixtureId?: number): Promise<void> {
  // Fetch played fixtures (optionally filtered)
  let fixtures = await db.select().from(fixturesTable).where(eq(fixturesTable.played, true));
  if (fixtureId !== undefined) {
    fixtures = fixtures.filter(f => f.id === fixtureId);
  }

  for (const fixture of fixtures) {
    const fid = fixture.id;
    const goalsConceded = fixture.isHome
      ? (fixture.awayScore ?? 0)
      : (fixture.homeScore ?? 0);

    // Players present
    const presence = await db
      .select({ playerId: fixturePlayersTable.playerId, name: playersTable.name, position: playersTable.position })
      .from(fixturePlayersTable)
      .innerJoin(playersTable, eq(fixturePlayersTable.playerId, playersTable.id))
      .where(and(eq(fixturePlayersTable.fixtureId, fid), eq(fixturePlayersTable.present, true)));

    if (presence.length === 0) continue;

    const allPlayers = await db.select().from(playersTable);

    const playerIds = presence.map(p => p.playerId);

    // Goals & assists per player
    const statsRows = await db
      .select()
      .from(statsTable)
      .where(and(eq(statsTable.fixtureId, fid), inArray(statsTable.playerId, playerIds)));

    // Ratings per player
    const ratingRows = await db
      .select()
      .from(playerRatingsTable)
      .where(and(eq(playerRatingsTable.fixtureId, fid), inArray(playerRatingsTable.playerId, playerIds)));

    // MOM award (type='mom')
    const momRows = await db
      .select()
      .from(awardsTable)
      .where(and(eq(awardsTable.fixtureId, fid), eq(awardsTable.type, "mom")));
    const momPlayerId = momRows[0]?.playerId ?? null;

    // Muppet award (type='motm')
    const muppetRows = await db
      .select()
      .from(awardsTable)
      .where(and(eq(awardsTable.fixtureId, fid), eq(awardsTable.type, "motm")));
    const muppetPlayerId = muppetRows[0]?.playerId ?? null;

    // Fan MOTM winner (most votes)
    const fanVoteRows = await db
      .select({ playerId: motmVotesTable.playerId, cnt: sql<number>`count(*)::int` })
      .from(motmVotesTable)
      .where(eq(motmVotesTable.fixtureId, fid))
      .groupBy(motmVotesTable.playerId)
      .orderBy(sql`count(*) desc`)
      .limit(1);
    const fanMotmPlayerId = fanVoteRows[0]?.playerId ?? null;

    // Determine King of the Match
    const isKingFixture = momPlayerId !== null && fanMotmPlayerId !== null && momPlayerId === fanMotmPlayerId;
    const kingPlayerId = isKingFixture ? momPlayerId : null;

    // Wipe existing 'king' awards for this fixture then re-create
    await db.delete(awardsTable).where(and(eq(awardsTable.fixtureId, fid), eq(awardsTable.type, "king")));
    if (kingPlayerId !== null) {
      await db.insert(awardsTable).values({ playerId: kingPlayerId, fixtureId: fid, type: "king" }).onConflictDoNothing();
    }

    // Calculate per player
    for (const player of allPlayers) {
      const breakdown: { label: string; amount: number }[] = [];
      let total = 0;
      const isPresent = presence.some(p => p.playerId === player.id);

      if (!isPresent) {
        await db
          .insert(playerValueChangesTable)
          .values({
            playerId: player.id,
            fixtureId: fid,
            totalChange: 0,
            breakdown: [],
            isKing: false,
          })
          .onConflictDoUpdate({
            target: [playerValueChangesTable.playerId, playerValueChangesTable.fixtureId],
            set: {
              totalChange: 0,
              breakdown: [],
              isKing: false,
              updatedAt: new Date(),
            },
          });
        continue;
      }

      const def = isDefOrGk(player.position);
      const goals = statsRows.filter(s => s.playerId === player.playerId && s.type === "goal").length;
      const assists = statsRows.filter(s => s.playerId === player.playerId && s.type === "assist").length;
      const ratingRow = ratingRows.find(r => r.playerId === player.playerId);
      const ratingVal = ratingRow ? parseFloat(String(ratingRow.rating)) : null;

      // 1. Appearance fee
      breakdown.push({ label: "Appearance Fee", amount: 100_000 });
      total += 100_000;

      // 1b. Result bonus (all players)
      const bsScore = fixture.isHome ? (fixture.homeScore ?? 0) : (fixture.awayScore ?? 0);
      const oppScore = fixture.isHome ? (fixture.awayScore ?? 0) : (fixture.homeScore ?? 0);
      if (bsScore > oppScore) {
        breakdown.push({ label: "Win Bonus", amount: 300_000 });
        total += 300_000;
      } else if (bsScore === oppScore) {
        breakdown.push({ label: "Draw Bonus", amount: 100_000 });
        total += 100_000;
      } else {
        breakdown.push({ label: "Loss Penalty", amount: -200_000 });
        total -= 200_000;
      }

      // 2. Goals
      if (goals > 0) {
        const bonus = def ? 300_000 * goals : 500_000 * goals;
        const role = def ? "DEF/GK" : "MID/FWD";
        breakdown.push({ label: `${goals > 1 ? goals + "x " : ""}Goal (${role})`, amount: bonus });
        total += bonus;
      }

      // 3. Assists
      if (assists > 0) {
        const bonus = def ? 200_000 * assists : 300_000 * assists;
        const role = def ? "DEF/GK" : "MID/FWD";
        breakdown.push({ label: `${assists > 1 ? assists + "x " : ""}Assist (${role})`, amount: bonus });
        total += bonus;
      }

      // 4. Defensive tier (GK/DEF full bonus; MID/FWD get smaller clean sheet reward only)
      if (def) {
        const { amount, label } = getDefBonus(goalsConceded);
        breakdown.push({ label, amount });
        total += amount;
      } else if (goalsConceded === 0) {
        breakdown.push({ label: "Clean Sheet Bonus (MID/FWD)", amount: 250_000 });
        total += 250_000;
      }

      // 5. Team disaster (all players, 6+ conceded)
      if (goalsConceded >= 6) {
        breakdown.push({ label: "Team Disaster Penalty", amount: -500_000 });
        total -= 500_000;
      }

      // 6. Passenger Tax (MID/FWD only, 0 goals & assists, rating < 7.5)
      if (!def && goals === 0 && assists === 0) {
        const waived = ratingVal !== null && ratingVal >= 7.5;
        if (!waived) {
          breakdown.push({ label: "Passenger Tax", amount: -300_000 });
          total -= 300_000;
        }
      }

      // 7. Rating bonus/penalty
      const ratingBonus = getRatingBonus(ratingVal);
      if (ratingBonus) {
        breakdown.push({ label: ratingBonus.label, amount: ratingBonus.amount });
        total += ratingBonus.amount;
      }

      // 8. Awards
      const isKingPlayer = kingPlayerId === player.playerId;
      if (isKingPlayer) {
        breakdown.push({ label: "King of the Match (MOM + Fans' MOTM)", amount: 2_000_000 });
        total += 2_000_000;
      } else {
        if (momPlayerId === player.playerId) {
          breakdown.push({ label: "Man of the Match", amount: 1_000_000 });
          total += 1_000_000;
        }
        if (fanMotmPlayerId === player.playerId) {
          breakdown.push({ label: "Fans' Man of the Match", amount: 500_000 });
          total += 500_000;
        }
      }

      if (muppetPlayerId === player.playerId) {
        breakdown.push({ label: "Muppet of the Match", amount: -1_000_000 });
        total -= 1_000_000;
      }

      // Upsert
      await db
        .insert(playerValueChangesTable)
        .values({
          playerId: player.playerId,
          fixtureId: fid,
          totalChange: total,
          breakdown,
          isKing: isKingPlayer,
        })
        .onConflictDoUpdate({
          target: [playerValueChangesTable.playerId, playerValueChangesTable.fixtureId],
          set: {
            totalChange: total,
            breakdown,
            isKing: isKingPlayer,
            updatedAt: new Date(),
          },
        });
    }
  }
}
