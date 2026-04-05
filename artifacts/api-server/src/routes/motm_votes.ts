import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, fixturesTable, motmVotesTable, fixturePlayersTable, playersTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const CastVoteBody = z.object({ playerId: z.number().int().positive(), deviceId: z.string().min(1) });

async function getVoteStatus(fixtureId: number, deviceId?: string) {
  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, fixtureId));
  if (!fixture) return null;

  const now = new Date();
  const votingClosesAt = fixture.votingClosesAt;
  const isOpen = !!votingClosesAt && now < votingClosesAt && fixture.played;

  // Get players who were present
  const presenceRecords = await db
    .select()
    .from(fixturePlayersTable)
    .where(and(eq(fixturePlayersTable.fixtureId, fixtureId), eq(fixturePlayersTable.present, true)));

  const presentPlayerIds = presenceRecords.map(r => r.playerId);
  const eligiblePlayers = await Promise.all(
    presentPlayerIds.map(async (playerId) => {
      const [player] = await db.select().from(playersTable).where(eq(playersTable.id, playerId));
      return { playerId, playerName: player?.name ?? "Unknown", present: true };
    })
  );

  // Vote counts
  const voteCounts = await db
    .select({ playerId: motmVotesTable.playerId, votes: sql<number>`count(*)::int` })
    .from(motmVotesTable)
    .where(eq(motmVotesTable.fixtureId, fixtureId))
    .groupBy(motmVotesTable.playerId);

  const results = eligiblePlayers.map(p => ({
    playerId: p.playerId,
    playerName: p.playerName,
    votes: voteCounts.find(v => v.playerId === p.playerId)?.votes ?? 0,
  }));

  // Has this device voted?
  let hasVoted = false;
  if (deviceId) {
    const existing = await db
      .select()
      .from(motmVotesTable)
      .where(and(eq(motmVotesTable.fixtureId, fixtureId), eq(motmVotesTable.deviceId, deviceId)));
    hasVoted = existing.length > 0;
  }

  return {
    isOpen,
    votingClosesAt: votingClosesAt?.toISOString() ?? null,
    hasVoted,
    eligiblePlayers,
    results,
  };
}

router.get("/fixtures/:id/vote-status", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid fixture ID" });
    return;
  }
  const deviceId = req.query.deviceId as string | undefined;
  const status = await getVoteStatus(params.data.id, deviceId);
  if (!status) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }
  res.json(status);
});

router.post("/fixtures/:id/vote", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid fixture ID" });
    return;
  }
  const body = CastVoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, params.data.id));
  if (!fixture) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }

  const now = new Date();
  const isOpen = !!fixture.votingClosesAt && now < fixture.votingClosesAt && fixture.played;
  if (!isOpen) {
    res.status(400).json({ error: "Voting is not open for this fixture" });
    return;
  }

  // Check already voted
  const existing = await db
    .select()
    .from(motmVotesTable)
    .where(and(eq(motmVotesTable.fixtureId, params.data.id), eq(motmVotesTable.deviceId, body.data.deviceId)));
  if (existing.length > 0) {
    res.status(409).json({ error: "Already voted from this device" });
    return;
  }

  // Check player was present
  const presence = await db
    .select()
    .from(fixturePlayersTable)
    .where(and(
      eq(fixturePlayersTable.fixtureId, params.data.id),
      eq(fixturePlayersTable.playerId, body.data.playerId),
      eq(fixturePlayersTable.present, true)
    ));
  if (presence.length === 0) {
    res.status(400).json({ error: "Player was not present in this fixture" });
    return;
  }

  await db.insert(motmVotesTable).values({
    fixtureId: params.data.id,
    playerId: body.data.playerId,
    deviceId: body.data.deviceId,
  });

  const status = await getVoteStatus(params.data.id, body.data.deviceId);
  res.status(201).json(status);
});

export default router;
