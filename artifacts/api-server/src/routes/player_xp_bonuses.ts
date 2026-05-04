import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, playerXpBonusesTable, playersTable } from "@workspace/db";

const router: IRouter = Router();

const CreateBonusBody = z.object({
  amount: z.coerce.number().int().positive(),
  reason: z.string().min(1).max(500),
});

// GET /players/:id/xp-bonuses — list all bonuses for a player
router.get("/players/:id/xp-bonuses", async (req, res): Promise<void> => {
  const playerId = parseInt(req.params.id);
  if (isNaN(playerId)) { res.status(400).json({ error: "Invalid player ID" }); return; }
  const bonuses = await db
    .select()
    .from(playerXpBonusesTable)
    .where(eq(playerXpBonusesTable.playerId, playerId))
    .orderBy(desc(playerXpBonusesTable.createdAt));
  res.json(bonuses);
});

// POST /players/:id/xp-bonuses — create a bonus
router.post("/players/:id/xp-bonuses", async (req, res): Promise<void> => {
  const playerId = parseInt(req.params.id);
  if (isNaN(playerId)) { res.status(400).json({ error: "Invalid player ID" }); return; }

  const parsed = CreateBonusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [player] = await db.select({ id: playersTable.id }).from(playersTable).where(eq(playersTable.id, playerId));
  if (!player) { res.status(404).json({ error: "Player not found" }); return; }

  const [bonus] = await db.insert(playerXpBonusesTable).values({
    playerId,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
  }).returning();

  res.status(201).json(bonus);
});

export default router;
