import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playerCommentsTable } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

router.get("/players/:id/comments", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid player id" }); return; }
  const comments = await db
    .select()
    .from(playerCommentsTable)
    .where(eq(playerCommentsTable.playerId, id))
    .orderBy(playerCommentsTable.createdAt);
  res.json(comments);
});

router.post("/players/:id/comments", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid player id" }); return; }
  const parsed = z.object({ comment: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "comment is required" }); return; }
  const [comment] = await db
    .insert(playerCommentsTable)
    .values({ playerId: id, comment: parsed.data.comment })
    .returning();
  res.status(201).json(comment);
});

router.delete("/players/comments/:commentId", async (req, res): Promise<void> => {
  const commentId = Number(req.params.commentId);
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid comment id" }); return; }
  await db.delete(playerCommentsTable).where(eq(playerCommentsTable.id, commentId));
  res.sendStatus(204);
});

export default router;
