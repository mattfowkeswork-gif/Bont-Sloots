import { Router, type IRouter } from "express";
import multer from "multer";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { objectStorageClient, ObjectStorageService } from "../lib/objectStorage";
import { randomUUID } from "crypto";

const router: IRouter = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const objectStorageService = new ObjectStorageService();

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  if (parts.length < 3) throw new Error("Invalid path");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

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

  const safeName = player.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const fileName = `${safeName}_headshot_${randomUUID().slice(0, 8)}.jpg`;

  const resized = await sharp(req.file.buffer)
    .resize(500, 500, { fit: "cover", position: "center" })
    .jpeg({ quality: 85 })
    .toBuffer();

  const privateDir = objectStorageService.getPrivateObjectDir();
  const gcsPath = `${privateDir}/player-photos/${fileName}`;
  const { bucketName, objectName } = parseObjectPath(gcsPath);

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(resized, {
    contentType: "image/jpeg",
    metadata: { cacheControl: "public, max-age=31536000" },
  });

  const storedPath = `/objects/player-photos/${fileName}`;

  await db.update(playersTable)
    .set({ photoUrl: storedPath })
    .where(eq(playersTable.id, id));

  res.json({ photoUrl: storedPath });
});

export default router;
