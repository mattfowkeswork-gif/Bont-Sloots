import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, fixturePlayersTable, playersTable, fixturesTable } from "@workspace/db";
import { recalculateFixtureValues } from "./value_calculator";
import { z } from "zod";

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const SetPlayersBody = z.object({ playerIds: z.array(z.number().int().positive()) });

router.get("/fixtures/:id/players", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid fixture ID" });
    return;
  }

  const players = await db.select().from(playersTable).orderBy(playersTable.name);
  const presenceRecords = await db
    .select()
    .from(fixturePlayersTable)
    .where(eq(fixturePlayersTable.fixtureId, params.data.id));

  const result = players.map(p => {
    const record = presenceRecords.find(r => r.playerId === p.id);
    return {
      playerId: p.id,
      playerName: p.name,
      present: record?.present ?? false,
    };
  });

  res.json(result);
});

router.put("/fixtures/:id/players", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid fixture ID" });
    return;
  }
  const body = SetPlayersBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const fixtureId = params.data.id;
  const presentIds = new Set(body.data.playerIds);
  const players = await db.select().from(playersTable).orderBy(playersTable.name);

  // Upsert all players
  for (const player of players) {
    const existing = await db
      .select()
      .from(fixturePlayersTable)
      .where(and(eq(fixturePlayersTable.fixtureId, fixtureId), eq(fixturePlayersTable.playerId, player.id)));

    if (existing.length > 0) {
      await db
        .update(fixturePlayersTable)
        .set({ present: presentIds.has(player.id) })
        .where(and(eq(fixturePlayersTable.fixtureId, fixtureId), eq(fixturePlayersTable.playerId, player.id)));
    } else {
      await db.insert(fixturePlayersTable).values({
        fixtureId,
        playerId: player.id,
        present: presentIds.has(player.id),
      });
    }
  }

  const result = players.map(p => ({
    playerId: p.id,
    playerName: p.name,
    present: presentIds.has(p.id),
  }));

  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, fixtureId));
  if (fixture?.played) {
    await recalculateFixtureValues(fixtureId);
  }

  res.json(result);
});

export default router;
