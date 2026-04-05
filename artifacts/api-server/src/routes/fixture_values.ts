import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, fixturePlayersTable, playersTable, playerValueChangesTable, fixturesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/fixtures/:id/value-changes", async (req, res): Promise<void> => {
  const fixtureId = parseInt(req.params.id, 10);
  if (isNaN(fixtureId)) { res.status(400).json({ error: "Invalid fixture id" }); return; }

  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, fixtureId));
  if (!fixture || !fixture.played) { res.status(404).json({ error: "Fixture not found or not played" }); return; }

  const changes = await db
    .select({
      playerId: playerValueChangesTable.playerId,
      playerName: playersTable.name,
      totalChange: playerValueChangesTable.totalChange,
      breakdown: playerValueChangesTable.breakdown,
      isKing: playerValueChangesTable.isKing,
    })
    .from(playerValueChangesTable)
    .innerJoin(playersTable, eq(playerValueChangesTable.playerId, playersTable.id))
    .where(eq(playerValueChangesTable.fixtureId, fixtureId))
    .orderBy(playerValueChangesTable.totalChange);

  res.json(changes.reverse());
});

export default router;
