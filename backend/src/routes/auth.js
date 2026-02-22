// src/routes/auth.js
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken, REFRESH_EXPIRES_MS } = require("../auth");
const authenticate = require("../middleware/authenticate");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Zbyt wiele prób logowania. Spróbuj za 15 minut." },
});

// POST /api/auth/login
router.post("/login", loginLimiter, [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Nieprawidłowe dane logowania" });

  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND is_active = 1").get(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
  }

  // Load user roles
  const roles = db.prepare(`
    SELECT r.role_key, r.role_name 
    FROM user_roles ur 
    JOIN roles r ON ur.role_key = r.role_key 
    WHERE ur.user_id = ? AND r.is_active = 1
  `).all(user.id);

  const roleKeys = roles.map(r => r.role_key);
  const roleNames = roles.map(r => r.role_name);

  const accessToken = signAccessToken({ sub: user.id, roles: roleKeys });
  const refreshToken = signRefreshToken({ sub: user.id });

  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, datetime('now', '+7 days'))
  `).run(uuidv4(), user.id, hashToken(refreshToken));

  // Clean old tokens
  db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')").run();

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_EXPIRES_MS,
    path: "/api/auth",
  });

  res.json({
    accessToken,
    user: { 
      id: user.id, 
      email: user.email, 
      fullName: user.full_name, 
      roles: roleKeys,
      roleNames: roleNames
    },
  });
});

// POST /api/auth/refresh
router.post("/refresh", (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "Brak refresh tokenu" });

  try {
    const payload = verifyRefreshToken(token);
    const stored = db.prepare("SELECT * FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > datetime('now')")
      .get(payload.sub, hashToken(token));

    if (!stored) return res.status(401).json({ error: "Token unieważniony" });

    const user = db.prepare("SELECT id, email, full_name, is_active FROM users WHERE id = ?").get(payload.sub);
    if (!user || !user.is_active) return res.status(401).json({ error: "Konto nieaktywne" });

    // Load user roles
    const roles = db.prepare(`
      SELECT r.role_key, r.role_name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_key = r.role_key 
      WHERE ur.user_id = ? AND r.is_active = 1
    `).all(user.id);

    const roleKeys = roles.map(r => r.role_key);
    const roleNames = roles.map(r => r.role_name);

    // Rotate refresh token
    db.prepare("DELETE FROM refresh_tokens WHERE id = ?").run(stored.id);
    const newRefreshToken = signRefreshToken({ sub: user.id });
    db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, datetime('now', '+7 days'))
    `).run(uuidv4(), user.id, hashToken(newRefreshToken));

    res.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_EXPIRES_MS,
      path: "/api/auth",
    });

    res.json({
      accessToken: signAccessToken({ sub: user.id, roles: roleKeys }),
      user: { 
        id: user.id, 
        email: user.email, 
        fullName: user.full_name, 
        roles: roleKeys,
        roleNames: roleNames
      },
    });
  } catch (err) {
    res.status(401).json({ error: "Token nieprawidłowy lub wygasły" });
  }
});

// POST /api/auth/logout
router.post("/logout", authenticate, (req, res) => {
  const token = req.cookies?.refresh_token;
  if (token) {
    db.prepare("DELETE FROM refresh_tokens WHERE user_id = ? AND token_hash = ?")
      .run(req.user.id, hashToken(token));
  }
  res.clearCookie("refresh_token", { path: "/api/auth" });
  res.json({ message: "Wylogowano pomyślnie" });
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  res.json({ 
    id: req.user.id, 
    email: req.user.email, 
    fullName: req.user.full_name, 
    roles: req.user.roles,
    roleNames: req.user.roleNames
  });
});

module.exports = router;
