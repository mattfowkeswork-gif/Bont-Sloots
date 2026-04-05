import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, playerRatingsTable, playersTable, fixturePlayersTable, awardsTable, fixturesTable } from "@workspace/db";
import { recalculateFixtureValues } from "./value_calculator";
import { z } from "zod";

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().positive() });

const SetRatingsBody = z.object({
  ratings: z.array(z.object({
    playerId: z.number().int().positive(),
    rating: z.number().min(0).max(10),
  }))
});

router.get("/fixtures/:id/ratings", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid fixture ID" }); return; }

  const fixtureId = params.data.id;

  const presenceRows = await db
    .select({ playerId: fixturePlayersTable.playerId, playerName: playersTable.name })
    .from(fixturePlayersTable)
    .innerJoin(playersTable, eq(fixturePlayersTable.playerId, playersTable.id))
    .where(and(eq(fixturePlayersTable.fixtureId, fixtureId), eq(fixturePlayersTable.present, true)));

  const ratingRows = await db
    .select()
    .from(playerRatingsTable)
    .where(eq(playerRatingsTable.fixtureId, fixtureId));

  const result = presenceRows.map(p => ({
    playerId: p.playerId,
    playerName: p.playerName,
    rating: ratingRows.find(r => r.playerId === p.playerId)?.rating ?? null,
  }));

  res.json(result);
});

router.put("/fixtures/:id/ratings", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid fixture ID" }); return; }
  const body = SetRatingsBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const fixtureId = params.data.id;

  // Upsert each rating
  for (const { playerId, rating } of body.data.ratings) {
    const existing = await db
      .select()
      .from(playerRatingsTable)
      .where(and(eq(playerRatingsTable.fixtureId, fixtureId), eq(playerRatingsTable.playerId, playerId)));

    if (existing.length > 0) {
      await db
        .update(playerRatingsTable)
        .set({ rating: String(rating) })
        .where(and(eq(playerRatingsTable.fixtureId, fixtureId), eq(playerRatingsTable.playerId, playerId)));
    } else {
      await db.insert(playerRatingsTable).values({ fixtureId, playerId, rating: String(rating) });
    }
  }

  // Auto-award MOM to the highest-rated player for this fixture
  const allRatings = await db
    .select()
    .from(playerRatingsTable)
    .where(eq(playerRatingsTable.fixtureId, fixtureId))
    .orderBy(desc(playerRatingsTable.rating));

  if (allRatings.length > 0) {
    const top = allRatings[0];
    const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, fixtureId));

    if (fixture) {
      // Remove any existing MOM award for this fixture
      await db
        .delete(awardsTable)
        .where(and(eq(awardsTable.fixtureId, fixtureId), eq(awardsTable.type, "mom")));

      // Create new MOM award for highest-rated player
      await db.insert(awardsTable).values({
        fixtureId,
        playerId: top.playerId,
        type: "mom",
      });
    }
  }

  // Recalculate player values for this fixture
  await recalculateFixtureValues(fixtureId);

  // Return updated list
  const presenceRows = await db
    .select({ playerId: fixturePlayersTable.playerId, playerName: playersTable.name })
    .from(fixturePlayersTable)
    .innerJoin(playersTable, eq(fixturePlayersTable.playerId, playersTable.id))
    .where(and(eq(fixturePlayersTable.fixtureId, fixtureId), eq(fixturePlayersTable.present, true)));

  const ratingRows = await db
    .select()
    .from(playerRatingsTable)
    .where(eq(playerRatingsTable.fixtureId, fixtureId));

  // Find the MOM winner name for the response
  const momAward = await db
    .select({ playerId: awardsTable.playerId, playerName: playersTable.name })
    .from(awardsTable)
    .innerJoin(playersTable, eq(awardsTable.playerId, playersTable.id))
    .where(and(eq(awardsTable.fixtureId, fixtureId), eq(awardsTable.type, "mom")));

  res.json({
    ratings: presenceRows.map(p => ({
      playerId: p.playerId,
      playerName: p.playerName,
      rating: ratingRows.find(r => r.playerId === p.playerId)?.rating ?? null,
    })),
    momWinner: momAward[0]?.playerName ?? null,
  });
});

export default router;
