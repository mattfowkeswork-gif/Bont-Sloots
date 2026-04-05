import { Router, type IRouter } from "express";
import multer from "multer";
import sharp from "sharp";
import { eq, asc } from "drizzle-orm";
import { db, matchReportsTable, matchReportPhotosTable, fixturesTable } from "@workspace/db";
import { objectStorageClient, ObjectStorageService } from "../lib/objectStorage";
import { randomUUID } from "crypto";
import { z } from "zod";

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

function mapReport(report: typeof matchReportsTable.$inferSelect, photos: typeof matchReportPhotosTable.$inferSelect[]) {
  return {
    id: report.id,
    fixtureId: report.fixtureId,
    overview: report.overview ?? null,
    photos: photos.map(p => ({
      id: p.id,
      photoUrl: p.photoUrl,
      caption: p.caption ?? null,
      sortOrder: p.sortOrder,
    })),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

// GET /fixtures/:id/report
router.get("/fixtures/:id/report", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [report] = await db.select().from(matchReportsTable).where(eq(matchReportsTable.fixtureId, id));
  if (!report) { res.status(404).json({ error: "No report found" }); return; }

  const photos = await db.select().from(matchReportPhotosTable)
    .where(eq(matchReportPhotosTable.reportId, report.id))
    .orderBy(asc(matchReportPhotosTable.sortOrder), asc(matchReportPhotosTable.createdAt));

  res.json(mapReport(report, photos));
});

// PUT /fixtures/:id/report  (upsert overview)
router.put("/fixtures/:id/report", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({ overview: z.string().nullable().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, id));
  if (!fixture) { res.status(404).json({ error: "Fixture not found" }); return; }

  const existing = await db.select().from(matchReportsTable).where(eq(matchReportsTable.fixtureId, id));

  let report: typeof matchReportsTable.$inferSelect;
  if (existing.length > 0) {
    const [updated] = await db.update(matchReportsTable)
      .set({ overview: parsed.data.overview ?? null, updatedAt: new Date() })
      .where(eq(matchReportsTable.fixtureId, id))
      .returning();
    report = updated;
  } else {
    const [created] = await db.insert(matchReportsTable)
      .values({ fixtureId: id, overview: parsed.data.overview ?? null })
      .returning();
    report = created;
  }

  const photos = await db.select().from(matchReportPhotosTable)
    .where(eq(matchReportPhotosTable.reportId, report.id))
    .orderBy(asc(matchReportPhotosTable.sortOrder), asc(matchReportPhotosTable.createdAt));

  res.json(mapReport(report, photos));
});

// POST /fixtures/:id/report/photos  (upload a photo)
router.post("/fixtures/:id/report/photos", upload.single("photo"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const [fixture] = await db.select().from(fixturesTable).where(eq(fixturesTable.id, id));
  if (!fixture) { res.status(404).json({ error: "Fixture not found" }); return; }

  // Ensure report exists
  let [report] = await db.select().from(matchReportsTable).where(eq(matchReportsTable.fixtureId, id));
  if (!report) {
    const [created] = await db.insert(matchReportsTable).values({ fixtureId: id }).returning();
    report = created;
  }

  const fileName = `match_${id}_${randomUUID().slice(0, 8)}.jpg`;

  const resized = await sharp(req.file.buffer)
    .resize(1200, 900, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const privateDir = objectStorageService.getPrivateObjectDir();
  const gcsPath = `${privateDir}/match-photos/${fileName}`;
  const { bucketName, objectName } = parseObjectPath(gcsPath);

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  await file.save(resized, {
    contentType: "image/jpeg",
    metadata: { cacheControl: "public, max-age=31536000" },
  });

  const storedPath = `/objects/match-photos/${fileName}`;
  const caption = typeof req.body?.caption === "string" ? req.body.caption || null : null;

  const [photo] = await db.insert(matchReportPhotosTable)
    .values({ reportId: report.id, photoUrl: storedPath, caption })
    .returning();

  res.json({ id: photo.id, photoUrl: photo.photoUrl, caption: photo.caption ?? null });
});

// DELETE /fixtures/:fixtureId/report/photos/:photoId
router.delete("/fixtures/:fixtureId/report/photos/:photoId", async (req, res): Promise<void> => {
  const photoId = Number(req.params.photoId);
  if (isNaN(photoId)) { res.status(400).json({ error: "Invalid photo id" }); return; }

  const [deleted] = await db.delete(matchReportPhotosTable)
    .where(eq(matchReportPhotosTable.id, photoId))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Photo not found" }); return; }
  res.sendStatus(204);
});

export default router;
