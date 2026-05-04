import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, awardsTable, playersTable, fixturesTable } from "@workspace/db";
import { recalculateFixtureValues } from "./value_calculator";
import {
  CreateAwardBody,
  DeleteAwardParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/awards", async (_req, res): Promise<void> => {
  const awards = await db
    .select({
      id: awardsTable.id,
      playerId: awardsTable.playerId,
      playerName: playersTable.name,
      fixtureId: awardsTable.fixtureId,
      fixtureOpponent: fixturesTable.opponent,
      type: awardsTable.type,
      createdAt: awardsTable.createdAt,
    })
    .from(awardsTable)
    .innerJoin(playersTable, eq(awardsTable.playerId, playersTable.id))
    .innerJoin(fixturesTable, eq(awardsTable.fixtureId, fixturesTable.id))
    .orderBy(awardsTable.createdAt);

  res.json(awards);
});

router.post("/awards", async (req, res): Promise<void> => {
  const parsed = CreateAwardBody.safeParse(req.body?.data ?? req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, parsed.data.playerId));
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, parsed.data.fixtureId));
  if (!fixture) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }

  const [award] = await db.insert(awardsTable).values({
    playerId: parsed.data.playerId,
    fixtureId: parsed.data.fixtureId,
    type: parsed.data.type,
  }).returning();

  // Trigger value recalculation for this fixture
  await recalculateFixtureValues(award.fixtureId);

  res.status(201).json({
    id: award.id,
    playerId: award.playerId,
    playerName: player.name,
    fixtureId: award.fixtureId,
    fixtureOpponent: fixture.opponent,
    type: award.type,
    createdAt: award.createdAt,
  });
});

router.delete("/awards/:id", async (req, res): Promise<void> => {
  const params = DeleteAwardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [award] = await db.delete(awardsTable).where(eq(awardsTable.id, params.data.id)).returning();
  if (!award) {
    res.status(404).json({ error: "Award not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
