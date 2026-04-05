import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const rows = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${req.session.userId} LIMIT 1`);
  const user = (rows as any).rows?.[0] ?? (rows as any)[0];
  if (!user?.is_admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// ─── Stats ───────────────────────────────────────────────────────────────────

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  try {
    const [users] = (await db.execute(sql`SELECT COUNT(*) as count FROM users`)) as any;
    const [activeUsers] = (await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`)) as any;
    const [codes] = (await db.execute(sql`SELECT COUNT(*) as count FROM access_codes WHERE is_active = true AND used_by IS NULL`)) as any;
    const [announcements] = (await db.execute(sql`SELECT COUNT(*) as count FROM announcements WHERE is_active = true`)) as any;

    const getCount = (r: any) => Number(r?.rows?.[0]?.count ?? r?.[0]?.count ?? 0);
    res.json({
      totalUsers: getCount(users),
      activeUsers: getCount(activeUsers),
      availableCodes: getCount(codes),
      activeAnnouncements: getCount(announcements),
    });
  } catch (err) {
    req.log.error({ err }, "Admin stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Users ───────────────────────────────────────────────────────────────────

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`SELECT id, email, is_admin, is_active, status, created_at FROM users ORDER BY created_at DESC`);
    const users = (rows as any).rows ?? rows;
    res.json({ users });
  } catch (err) {
    req.log.error({ err }, "Admin list users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const { email, password, isAdmin, isActive } = req.body as { email: string; password: string; isAdmin?: boolean; isActive?: boolean };
  if (!email || !password) { res.status(400).json({ error: "Email and password are required" }); return; }
  if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }
  try {
    const existing = await db.execute(sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`);
    const exists = (existing as any).rows?.[0] ?? (existing as any)[0];
    if (exists) { res.status(409).json({ error: "Email already in use" }); return; }

    const hash = await bcrypt.hash(password, 12);
    await db.execute(sql`INSERT INTO users (email, password_hash, is_admin, is_active) VALUES (${email.toLowerCase()}, ${hash}, ${isAdmin ?? false}, ${isActive ?? true})`);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin create user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { email, password, isAdmin, isActive } = req.body as { email?: string; password?: string; isAdmin?: boolean; isActive?: boolean };
  try {
    if (email) {
      await db.execute(sql`UPDATE users SET email = ${email.toLowerCase()} WHERE id = ${id}`);
    }
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 12);
      await db.execute(sql`UPDATE users SET password_hash = ${hash} WHERE id = ${id}`);
    }
    if (isAdmin !== undefined) {
      await db.execute(sql`UPDATE users SET is_admin = ${isAdmin} WHERE id = ${id}`);
    }
    if (isActive !== undefined) {
      const status = isActive ? "active" : "banned";
      await db.execute(sql`UPDATE users SET is_active = ${isActive}, status = ${status} WHERE id = ${id}`);
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin update user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (id === req.session.userId) { res.status(400).json({ error: "Cannot delete your own account" }); return; }
  try {
    await db.execute(sql`DELETE FROM users WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin delete user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Access Codes ─────────────────────────────────────────────────────────────

router.get("/admin/access-codes", requireAdmin, async (req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT ac.*, u.email as used_by_email
      FROM access_codes ac
      LEFT JOIN users u ON u.id = ac.used_by
      ORDER BY ac.created_at DESC
    `);
    const codes = (rows as any).rows ?? rows;
    res.json({ codes });
  } catch (err) {
    req.log.error({ err }, "Admin list codes error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/access-codes", requireAdmin, async (req, res): Promise<void> => {
  const { code, badge, notes } = req.body as { code: string; badge?: string; notes?: string };
  if (!code) { res.status(400).json({ error: "Code is required" }); return; }
  try {
    await db.execute(sql`INSERT INTO access_codes (code, badge, notes, created_by, is_active) VALUES (${code.trim()}, ${badge || null}, ${notes || null}, ${req.session.userId!}, true)`);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message?.includes("unique") || err.code === "23505") {
      res.status(409).json({ error: "Code already exists" }); return;
    }
    req.log.error({ err }, "Admin create code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/access-codes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    await db.execute(sql`DELETE FROM access_codes WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin delete code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Announcements ────────────────────────────────────────────────────────────

router.get("/admin/announcements", requireAdmin, async (req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`SELECT * FROM announcements ORDER BY created_at DESC`);
    const announcements = (rows as any).rows ?? rows;
    res.json({ announcements });
  } catch (err) {
    req.log.error({ err }, "Admin list announcements error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/announcements", requireAdmin, async (req, res): Promise<void> => {
  const { title, message, type, isActive } = req.body as { title: string; message: string; type: string; isActive?: boolean };
  if (!title || !message) { res.status(400).json({ error: "Title and message are required" }); return; }
  try {
    await db.execute(sql`INSERT INTO announcements (title, message, type, is_active) VALUES (${title}, ${message}, ${type || "info"}, ${isActive ?? true})`);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin create announcement error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/announcements/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { title, message, type, isActive } = req.body as { title?: string; message?: string; type?: string; isActive?: boolean };
  try {
    await db.execute(sql`
      UPDATE announcements SET
        title = COALESCE(${title ?? null}, title),
        message = COALESCE(${message ?? null}, message),
        type = COALESCE(${type ?? null}, type),
        is_active = COALESCE(${isActive ?? null}, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin update announcement error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/announcements/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    await db.execute(sql`DELETE FROM announcements WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin delete announcement error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── User Activity ────────────────────────────────────────────────────────────

router.get("/admin/user-activity", requireAdmin, async (req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT
        u.id,
        u.email,
        u.is_admin,
        u.is_active,
        u.created_at,
        COUNT(ll.id) FILTER (WHERE ll.login_timestamp >= NOW() - INTERVAL '24 hours') AS login_count_24h,
        array_agg(DISTINCT ll.ip_address) FILTER (WHERE ll.login_timestamp >= NOW() - INTERVAL '24 hours' AND ll.ip_address IS NOT NULL) AS ip_addresses,
        MAX(ll.login_timestamp) AS last_login
      FROM users u
      LEFT JOIN login_logs ll ON ll.user_id = u.id
      GROUP BY u.id
      ORDER BY last_login DESC NULLS LAST
    `);
    const users = (rows as any).rows ?? rows;
    res.json({ users });
  } catch (err) {
    req.log.error({ err }, "Admin user-activity error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── App Connections ──────────────────────────────────────────────────────────

router.get("/admin/app-connections", requireAdmin, async (req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`SELECT id, name, api_key, is_active, notes, created_at, last_used_at FROM app_connections ORDER BY created_at DESC`);
    const apps = (rows as any).rows ?? rows;
    res.json({ apps });
  } catch (err) {
    req.log.error({ err }, "Admin list app connections error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/app-connections", requireAdmin, async (req, res): Promise<void> => {
  const { name, notes } = req.body as { name: string; notes?: string };
  if (!name?.trim()) { res.status(400).json({ error: "App name is required" }); return; }
  try {
    const apiKey = randomUUID();
    const secret = randomBytes(32).toString("hex");
    const secretHash = await bcrypt.hash(secret, 12);
    await db.execute(sql`
      INSERT INTO app_connections (name, api_key, secret_hash, notes, is_active)
      VALUES (${name.trim()}, ${apiKey}, ${secretHash}, ${notes || null}, true)
    `);
    res.json({ success: true, apiKey, secret });
  } catch (err) {
    req.log.error({ err }, "Admin create app connection error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/app-connections/:id/toggle", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    await db.execute(sql`UPDATE app_connections SET is_active = NOT is_active WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin toggle app connection error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/app-connections/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    await db.execute(sql`DELETE FROM app_connections WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin delete app connection error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Object Storage Config ─────────────────────────────────────────────────────

function maskSecret(s: string | null) {
  if (!s) return null;
  if (s.length <= 4) return "****";
  return "****" + s.slice(-4);
}

router.get("/admin/object-storage", requireAdmin, async (req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT id, name, provider, endpoint, bucket, region, access_key_id,
             secret_access_key, is_active, notes, created_at
      FROM object_storage_configs ORDER BY created_at DESC
    `);
    const rows = Array.from(result as any) as any[];
    const masked = rows.map(r => ({ ...r, secret_access_key: maskSecret(r.secret_access_key) }));
    res.json(masked);
  } catch (err) {
    req.log.error({ err }, "List object storage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/object-storage", requireAdmin, async (req, res): Promise<void> => {
  const { name, provider, endpoint, bucket, region, access_key_id, secret_access_key, notes } = req.body;
  if (!name || !bucket) {
    res.status(400).json({ error: "name and bucket are required" });
    return;
  }
  try {
    const rows = await db.execute(sql`
      INSERT INTO object_storage_configs (name, provider, endpoint, bucket, region, access_key_id, secret_access_key, notes)
      VALUES (${name}, ${provider ?? "s3"}, ${endpoint ?? null}, ${bucket},
              ${region ?? null}, ${access_key_id ?? null}, ${secret_access_key ?? null}, ${notes ?? null})
      RETURNING id, name, provider, endpoint, bucket, region, access_key_id, is_active, notes, created_at
    `) as any[];
    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Create object storage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/object-storage/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { name, provider, endpoint, bucket, region, access_key_id, secret_access_key, notes } = req.body;
  const newSecret = secret_access_key && secret_access_key.trim() ? secret_access_key.trim() : null;
  try {
    await db.execute(sql`
      UPDATE object_storage_configs
      SET name = COALESCE(${name ?? null}, name),
          provider = COALESCE(${provider ?? null}, provider),
          endpoint = ${endpoint ?? null},
          bucket = COALESCE(${bucket ?? null}, bucket),
          region = ${region ?? null},
          access_key_id = ${access_key_id ?? null},
          notes = ${notes ?? null},
          secret_access_key = CASE WHEN ${newSecret}::text IS NOT NULL
                                   THEN ${newSecret}
                                   ELSE secret_access_key END
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Update object storage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/object-storage/:id/set-active", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    await db.execute(sql`UPDATE object_storage_configs SET is_active = false`);
    await db.execute(sql`UPDATE object_storage_configs SET is_active = true WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Set active object storage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/object-storage/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    await db.execute(sql`DELETE FROM object_storage_configs WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Delete object storage error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
