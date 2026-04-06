import { Router, type IRouter } from "express";
import multer from "multer";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router: IRouter = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.post("/players/:id/photo", upload.single("photo"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid player id" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const resized = await sharp(req.file.buffer)
    .resize(500, 500, { fit: "cover", position: "center" })
    .jpeg({ quality: 85 })
    .toBuffer();

  const dataUrl = `data:image/jpeg;base64,${resized.toString("base64")}`;

  await db.update(playersTable)
    .set({ photoUrl: dataUrl })
    .where(eq(playersTable.id, id));

  res.json({ photoUrl: dataUrl });
});

export default router;
