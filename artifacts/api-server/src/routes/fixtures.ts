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

function mapFixture(f: typeof fixturesTable.$inferSelect) {
  return {
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
  };
}

router.get("/fixtures", async (_req, res): Promise<void> => {
  const fixtures = await db.select().from(fixturesTable).orderBy(fixturesTable.matchDate);
  res.json(fixtures.map(mapFixture));
});

// Bulk create must be before /fixtures/:id
router.post("/fixtures/bulk", async (req, res): Promise<void> => {
  const { text, seasonId, defaultYear } = req.body as {
    text: string;
    seasonId?: number | null;
    defaultYear?: number | null;
  };

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const year = defaultYear ?? new Date().getFullYear();
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const created = [];

  for (const line of lines) {
    // Parse formats: "12/04 vs Real Sosobad", "12/04 Real Sosobad", "12 Apr vs Real Sosobad"
    const match = line.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\s+(?:vs\.?\s+)?(.+)$/i)
      || line.match(/^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(?:vs\.?\s+)?(.+)$/i);

    if (!match) continue;

    let day: number, month: number, actualYear: number, opponent: string;

    if (match[2] && isNaN(parseInt(match[2]))) {
      // "12 Apr vs Opponent" format
      const monthNames: Record<string, number> = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
      };
      day = parseInt(match[1]);
      month = monthNames[match[2].toLowerCase().slice(0, 3)] ?? 1;
      actualYear = year;
      opponent = match[3].replace(/^vs\.?\s+/i, "").trim();
    } else {
      day = parseInt(match[1]);
      month = parseInt(match[2]);
      actualYear = match[3] ? parseInt(match[3].length === 2 ? `20${match[3]}` : match[3]) : year;
      opponent = match[4].replace(/^vs\.?\s+/i, "").trim();
    }

    if (!opponent || isNaN(day) || isNaN(month)) continue;

    const matchDate = `${actualYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const [fixture] = await db.insert(fixturesTable).values({
      opponent,
      matchDate,
      kickoffTbc: true,
      isHome: true,
      played: false,
      seasonId: seasonId ?? null,
    }).returning();

    created.push(mapFixture(fixture));
  }

  res.status(201).json(created);
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
    seasonId: (parsed.data as any).seasonId ?? null,
  }).returning();
  res.status(201).json(mapFixture(fixture));
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
  res.json(mapFixture(fixture));
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

  // Get current fixture to check if played status is changing
  const [current] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.opponent !== undefined) updateData.opponent = parsed.data.opponent;
  if (parsed.data.matchDate !== undefined) updateData.matchDate = parsed.data.matchDate;
  if (parsed.data.kickoffTime !== undefined) updateData.kickoffTime = parsed.data.kickoffTime;
  if (parsed.data.kickoffTbc !== undefined) updateData.kickoffTbc = parsed.data.kickoffTbc;
  if (parsed.data.homeScore !== undefined) updateData.homeScore = parsed.data.homeScore;
  if (parsed.data.awayScore !== undefined) updateData.awayScore = parsed.data.awayScore;
  if (parsed.data.played !== undefined) {
    updateData.played = parsed.data.played;
    // Open 48-hour voting window when match is first marked as played
    if (parsed.data.played && !current.played) {
      const closes = new Date();
      closes.setHours(closes.getHours() + 48);
      updateData.votingClosesAt = closes;
    }
  }
  if (parsed.data.isHome !== undefined) updateData.isHome = parsed.data.isHome;
  if (parsed.data.venue !== undefined) updateData.venue = parsed.data.venue;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if ((parsed.data as any).seasonId !== undefined) updateData.seasonId = (parsed.data as any).seasonId;

  const [fixture] = await db
    .update(fixturesTable)
    .set(updateData)
    .where(eq(fixturesTable.id, params.data.id))
    .returning();

  if (!fixture) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }
  res.json(mapFixture(fixture));
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
