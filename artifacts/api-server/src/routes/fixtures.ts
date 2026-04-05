import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, fixturesTable } from "@workspace/db";
import {
  CreateFixtureBody,
  GetFixtureParams,
  UpdateFixtureParams,
  UpdateFixtureBody,
  DeleteFixtureParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/fixtures", async (_req, res): Promise<void> => {
  const fixtures = await db.select().from(fixturesTable).orderBy(fixturesTable.matchDate);
  res.json(fixtures.map(f => ({
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
  })));
});

router.post("/fixtures", async (req, res): Promise<void> => {
  const parsed = CreateFixtureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [fixture] = await db.insert(fixturesTable).values({
    opponent: parsed.data.opponent,
    matchDate: parsed.data.matchDate,
    kickoffTime: parsed.data.kickoffTime ?? null,
    kickoffTbc: parsed.data.kickoffTbc,
    isHome: parsed.data.isHome,
    venue: parsed.data.venue ?? null,
    notes: parsed.data.notes ?? null,
    played: false,
  }).returning();
  res.status(201).json({
    id: fixture.id,
    opponent: fixture.opponent,
    matchDate: fixture.matchDate,
    kickoffTime: fixture.kickoffTime ?? null,
    kickoffTbc: fixture.kickoffTbc,
    homeScore: fixture.homeScore ?? null,
    awayScore: fixture.awayScore ?? null,
    played: fixture.played,
    isHome: fixture.isHome,
    venue: fixture.venue ?? null,
    notes: fixture.notes ?? null,
  });
});

router.get("/fixtures/:id", async (req, res): Promise<void> => {
  const params = GetFixtureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, params.data.id));
  if (!fixture) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }
  res.json({
    id: fixture.id,
    opponent: fixture.opponent,
    matchDate: fixture.matchDate,
    kickoffTime: fixture.kickoffTime ?? null,
    kickoffTbc: fixture.kickoffTbc,
    homeScore: fixture.homeScore ?? null,
    awayScore: fixture.awayScore ?? null,
    played: fixture.played,
    isHome: fixture.isHome,
    venue: fixture.venue ?? null,
    notes: fixture.notes ?? null,
  });
});

router.put("/fixtures/:id", async (req, res): Promise<void> => {
  const params = UpdateFixtureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFixtureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.opponent !== undefined) updateData.opponent = parsed.data.opponent;
  if (parsed.data.matchDate !== undefined) updateData.matchDate = parsed.data.matchDate;
  if (parsed.data.kickoffTime !== undefined) updateData.kickoffTime = parsed.data.kickoffTime;
  if (parsed.data.kickoffTbc !== undefined) updateData.kickoffTbc = parsed.data.kickoffTbc;
  if (parsed.data.homeScore !== undefined) updateData.homeScore = parsed.data.homeScore;
  if (parsed.data.awayScore !== undefined) updateData.awayScore = parsed.data.awayScore;
  if (parsed.data.played !== undefined) updateData.played = parsed.data.played;
  if (parsed.data.isHome !== undefined) updateData.isHome = parsed.data.isHome;
  if (parsed.data.venue !== undefined) updateData.venue = parsed.data.venue;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const [fixture] = await db
    .update(fixturesTable)
    .set(updateData)
    .where(eq(fixturesTable.id, params.data.id))
    .returning();
  if (!fixture) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }
  res.json({
    id: fixture.id,
    opponent: fixture.opponent,
    matchDate: fixture.matchDate,
    kickoffTime: fixture.kickoffTime ?? null,
    kickoffTbc: fixture.kickoffTbc,
    homeScore: fixture.homeScore ?? null,
    awayScore: fixture.awayScore ?? null,
    played: fixture.played,
    isHome: fixture.isHome,
    venue: fixture.venue ?? null,
    notes: fixture.notes ?? null,
  });
});

router.delete("/fixtures/:id", async (req, res): Promise<void> => {
  const params = DeleteFixtureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [fixture] = await db.delete(fixturesTable).where(eq(fixturesTable.id, params.data.id)).returning();
  if (!fixture) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
