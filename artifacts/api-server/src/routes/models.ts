import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { objectStorageClient } from "../lib/objectStorage";
import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";

const router = Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, _file, cb) => cb(null, `fixr-upload-${randomUUID()}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 * 1024 },
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set");
  return dir;
}

function parseBucketAndObject(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

router.get("/models", requireAuth, async (req: any, res) => {
  try {
    const result = await db.execute(sql`
      SELECT m.*, u.email as uploaded_by_email
      FROM uploaded_models m
      LEFT JOIN users u ON u.id = m.uploaded_by
      ORDER BY m.created_at DESC
    `);
    res.json(Array.from(result as any));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to list models" });
  }
});

router.post("/models/upload", requireAuth, upload.single("file"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });

  const tmpPath = req.file.path;

  try {
    const privateDir = getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseBucketAndObject(fullPath);

    const bucket = objectStorageClient.bucket(bucketName);
    const gcsFile = bucket.file(objectName);

    const readStream = fs.createReadStream(tmpPath);
    const writeStream = gcsFile.createWriteStream({
      metadata: { contentType: req.file.mimetype || "application/octet-stream" },
      resumable: false,
    });

    await new Promise<void>((resolve, reject) => {
      readStream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      readStream.on("error", reject);
    });

    const objectPath = `/objects/uploads/${objectId}`;
    res.json({ objectPath, originalName: req.file.originalname, size: req.file.size });
  } catch (err: any) {
    req.log?.error(err);
    res.status(500).json({ error: "Upload to storage failed: " + (err?.message ?? "unknown error") });
  } finally {
    fs.unlink(tmpPath, () => {});
  }
});

router.post("/models", requireAuth, async (req: any, res) => {
  const { name, description, fileName, objectPath, fileSize, format } = req.body;
  if (!name || !fileName || !objectPath) {
    return res.status(400).json({ error: "name, fileName, objectPath are required" });
  }
  try {
    const rows = await db.execute(sql`
      INSERT INTO uploaded_models (name, description, file_name, object_path, file_size, format, uploaded_by)
      VALUES (${name}, ${description ?? null}, ${fileName}, ${objectPath}, ${fileSize ?? null}, ${format ?? null}, ${req.session.userId})
      RETURNING *
    `);
    res.status(201).json((rows as any[])[0]);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to register model" });
  }
});

router.delete("/models/:id", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await db.execute(sql`DELETE FROM uploaded_models WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to delete model" });
  }
});

router.post("/models/:id/add-server", requireAuth, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const { baseUrl, apiKey } = req.body;
  if (!baseUrl) return res.status(400).json({ error: "baseUrl is required" });
  try {
    const modelRows = await db.execute(sql`SELECT * FROM uploaded_models WHERE id = ${id}`) as any[];
    if (!modelRows.length) return res.status(404).json({ error: "Model not found" });
    const model = modelRows[0];
    const serverName = `[Model] ${model.name}`;
    const modelId = (model.file_name as string).replace(/\.[^/.]+$/, "");
    const existing = await db.execute(sql`SELECT id FROM server_configs WHERE name = ${serverName}`) as any[];
    if (existing.length > 0) {
      await db.execute(sql`
        UPDATE server_configs SET base_url = ${baseUrl}, model = ${modelId}, api_key = ${apiKey ?? null}
        WHERE id = ${existing[0].id}
      `);
      return res.json({ ok: true, serverId: existing[0].id, updated: true });
    }
    const result = await db.execute(sql`
      INSERT INTO server_configs (name, base_url, model, api_key, is_default)
      VALUES (${serverName}, ${baseUrl}, ${modelId}, ${apiKey ?? null}, false)
      RETURNING id
    `) as any[];
    res.json({ ok: true, serverId: result[0].id, updated: false });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to add server config" });
  }
});

export default router;
