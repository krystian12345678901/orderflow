// src/routes/users.js
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const VALID_ROLES = ["administrator","office_employee","editor","quality_control","illustrator","graphic_designer","printer"];

// GET /api/users — Admin only
router.get("/", authenticate, authorize("administrator"), (req, res) => {
  const users = db.prepare("SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC").all();
  res.json(users);
});

// POST /api/users — Create user (Admin)
router.post("/", authenticate, authorize("administrator"), [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  body("fullName").trim().notEmpty(),
  body("role").isIn(VALID_ROLES),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, fullName, role } = req.body;
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Email już istnieje" });

  const id = uuidv4();
  const hash = await bcrypt.hash(password, 12);
  db.prepare("INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)").run(id, email, hash, fullName, role);

  res.status(201).json({ id, email, fullName, role, isActive: true });
});

// GET /api/users/:id
router.get("/:id", authenticate, authorize("administrator"), (req, res) => {
  const user = db.prepare("SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Użytkownik nie znaleziony" });
  res.json(user);
});

// PATCH /api/users/:id
router.patch("/:id", authenticate, authorize("administrator"), [
  body("role").optional().isIn(VALID_ROLES),
  body("isActive").optional().isBoolean(),
  body("fullName").optional().trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { role, isActive, fullName, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Użytkownik nie znaleziony" });

  const updates = [];
  const params = [];

  if (role !== undefined)     { updates.push("role = ?");      params.push(role); }
  if (isActive !== undefined) { updates.push("is_active = ?"); params.push(isActive ? 1 : 0); }
  if (fullName !== undefined) { updates.push("full_name = ?"); params.push(fullName); }
  if (password !== undefined && password.length >= 8) {
    updates.push("password_hash = ?");
    params.push(await bcrypt.hash(password, 12));
  }

  if (updates.length === 0) return res.status(400).json({ error: "Brak zmian do zapisania" });

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare("SELECT id, email, full_name, role, is_active FROM users WHERE id = ?").get(req.params.id);
  res.json(updated);
});

module.exports = router;
