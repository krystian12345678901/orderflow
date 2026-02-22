// src/routes/admin.js
const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

// ── FORM FIELD CONFIGS ────────────────────────────────────────────────────────
router.get("/form-configs", authenticate, authorize("administrator"), (req, res) => {
  const { role } = req.query;
  let sql = "SELECT * FROM form_field_configs WHERE is_active = 1";
  const params = [];
  if (role) { sql += " AND role = ?"; params.push(role); }
  sql += " ORDER BY role, sort_order";
  res.json(db.prepare(sql).all(...params));
});

router.post("/form-configs", authenticate, authorize("administrator"), [
  body("role").notEmpty(),
  body("fieldKey").trim().notEmpty(),
  body("label").trim().notEmpty(),
  body("fieldType").isIn(["text", "number", "select", "file", "textarea", "date"]),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { role, fieldKey, label, fieldType, isRequired, options, allowedExtensions, maxFileSizeMb, sortOrder } = req.body;
  const id = uuidv4();

  db.prepare(`
    INSERT INTO form_field_configs (id, role, field_key, label, field_type, is_required, options, allowed_extensions, max_file_size_mb, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, role, fieldKey, label, fieldType, isRequired ? 1 : 0,
    options ? JSON.stringify(options) : null,
    allowedExtensions || null,
    maxFileSizeMb || null,
    sortOrder || 0
  );

  res.status(201).json(db.prepare("SELECT * FROM form_field_configs WHERE id = ?").get(id));
});

router.patch("/form-configs/:id", authenticate, authorize("administrator"), (req, res) => {
  const config = db.prepare("SELECT * FROM form_field_configs WHERE id = ?").get(req.params.id);
  if (!config) return res.status(404).json({ error: "Konfiguracja nie znaleziona" });

  const { label, isRequired, allowedExtensions, maxFileSizeMb, sortOrder, isActive } = req.body;
  db.prepare(`
    UPDATE form_field_configs
    SET label = COALESCE(?, label),
        is_required = COALESCE(?, is_required),
        allowed_extensions = COALESCE(?, allowed_extensions),
        max_file_size_mb = COALESCE(?, max_file_size_mb),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(label, isRequired !== undefined ? (isRequired ? 1 : 0) : null,
    allowedExtensions, maxFileSizeMb, sortOrder,
    isActive !== undefined ? (isActive ? 1 : 0) : null,
    req.params.id
  );

  res.json(db.prepare("SELECT * FROM form_field_configs WHERE id = ?").get(req.params.id));
});

router.delete("/form-configs/:id", authenticate, authorize("administrator"), (req, res) => {
  db.prepare("UPDATE form_field_configs SET is_active = 0 WHERE id = ?").run(req.params.id);
  res.json({ message: "Konfiguracja dezaktywowana" });
});

// ── AUDIT LOGS ────────────────────────────────────────────────────────────────
router.get("/audit-logs", authenticate, authorize("administrator"), (req, res) => {
  const { entityType, actorId, page = 1, limit = 50 } = req.query;
  let sql = `
    SELECT al.*, u.full_name as actor_name, u.email as actor_email
    FROM audit_logs al
    LEFT JOIN users u ON al.actor_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (entityType) { sql += " AND al.entity_type = ?"; params.push(entityType); }
  if (actorId)    { sql += " AND al.actor_id = ?";    params.push(actorId); }
  sql += " ORDER BY al.created_at DESC LIMIT ? OFFSET ?";
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  res.json(db.prepare(sql).all(...params));
});

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
router.get("/dashboard", authenticate, authorize("administrator"), (req, res) => {
  const statusCounts = db.prepare("SELECT status, COUNT(*) as count FROM orders GROUP BY status").all();
  const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders").get().count;
  const activeOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('completed','cancelled')").get().count;
  const completedToday = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed' AND updated_at >= date('now')").get().count;
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_active = 1").get().count;

  const recentOrders = db.prepare(`
    SELECT o.*, u.full_name as creator_name
    FROM orders o JOIN users u ON o.created_by = u.id
    ORDER BY o.created_at DESC LIMIT 10
  `).all();

  res.json({ totalOrders, activeOrders, completedToday, userCount, statusCounts, recentOrders });
});

module.exports = router;
