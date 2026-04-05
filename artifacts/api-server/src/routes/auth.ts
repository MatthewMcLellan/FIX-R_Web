import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const { email, password, accessCode } = req.body as { email: string; password: string; accessCode: string };

  if (!email || !password || !accessCode) {
    res.status(400).json({ success: false, error: "Email, password, and access code are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const codeRows = await db.execute(sql`SELECT id, badge FROM access_codes WHERE code = ${accessCode.trim().toUpperCase()} AND is_active = true AND used_by IS NULL LIMIT 1`);
    const code = (codeRows as any).rows?.[0] ?? (codeRows as any)[0];
    if (!code) {
      res.status(400).json({ success: false, error: "Invalid or already used access code" });
      return;
    }

    const existingRows = await db.execute(sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`);
    const existing = (existingRows as any).rows?.[0] ?? (existingRows as any)[0];
    if (existing) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const newUserRows = await db.execute(sql`INSERT INTO users (email, password_hash, is_active, status) VALUES (${email.toLowerCase()}, ${hash}, true, 'active') RETURNING id, email, is_admin, created_at`);
    const newUser = (newUserRows as any).rows?.[0] ?? (newUserRows as any)[0];

    await db.execute(sql`UPDATE access_codes SET used_by = ${newUser.id}, used_at = CURRENT_TIMESTAMP WHERE id = ${code.id}`);

    req.session.userId = newUser.id;
    res.json({ success: true, user: { id: newUser.id, email: newUser.email } });
  } catch (err) {
    req.log.error({ err }, "Signup error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ success: false, error: "Email and password are required" });
    return;
  }

  try {
    const rows = await db.execute(sql`SELECT id, email, password_hash, is_active, status FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`);
    const user = (rows as any).rows?.[0] ?? (rows as any)[0];

    if (!user) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    if (!user.is_active || user.status === "banned") {
      res.status(403).json({ success: false, error: "Account is disabled" });
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    req.session.userId = user.id;

    try {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      await db.execute(sql`INSERT INTO login_logs (user_id, ip_address) VALUES (${user.id}, ${ip})`);
    } catch {}

    res.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.json({ authenticated: false });
    return;
  }

  try {
    const rows = await db.execute(sql`SELECT id, email, is_admin, created_at FROM users WHERE id = ${req.session.userId} LIMIT 1`);
    const user = (rows as any).rows?.[0] ?? (rows as any)[0];

    if (!user) {
      req.session.destroy(() => {});
      res.json({ authenticated: false });
      return;
    }

    res.json({ authenticated: true, user: { id: user.id, email: user.email, isAdmin: user.is_admin, createdAt: user.created_at } });
  } catch (err) {
    req.log.error({ err }, "Auth check error");
    res.status(500).json({ authenticated: false });
  }
});

router.post("/auth/update-email", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return;
  }

  const { newEmail, password } = req.body as { newEmail: string; password: string };

  if (!newEmail || !password) {
    res.status(400).json({ success: false, error: "New email and password are required" });
    return;
  }

  try {
    const rows = await db.execute(sql`SELECT password_hash FROM users WHERE id = ${req.session.userId} LIMIT 1`);
    const user = (rows as any).rows?.[0] ?? (rows as any)[0];

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ success: false, error: "Incorrect password" });
      return;
    }

    const existing = await db.execute(sql`SELECT id FROM users WHERE email = ${newEmail.toLowerCase()} AND id != ${req.session.userId} LIMIT 1`);
    const existingUser = (existing as any).rows?.[0] ?? (existing as any)[0];
    if (existingUser) {
      res.status(409).json({ success: false, error: "Email already in use" });
      return;
    }

    await db.execute(sql`UPDATE users SET email = ${newEmail.toLowerCase()} WHERE id = ${req.session.userId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Update email error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/auth/update-password", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return;
  }

  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, error: "Current and new password are required" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ success: false, error: "New password must be at least 6 characters" });
    return;
  }

  try {
    const rows = await db.execute(sql`SELECT password_hash FROM users WHERE id = ${req.session.userId} LIMIT 1`);
    const user = (rows as any).rows?.[0] ?? (rows as any)[0];

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      res.status(401).json({ success: false, error: "Current password is incorrect" });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.execute(sql`UPDATE users SET password_hash = ${hash} WHERE id = ${req.session.userId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Update password error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
