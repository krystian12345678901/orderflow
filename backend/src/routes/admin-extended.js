// src/routes/admin-extended.js — Extended admin endpoints
const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { auditLog } = require("../middleware/authorize");

// All routes require authentication + administrator role
router.use(authenticate);
router.use(authorize("administrator"));

// ═══════════════════════════════════════════════════════════════════════════
// ROLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin-ext/roles — List all roles
router.get("/roles", (req, res) => {
  const roles = db.prepare(`
    SELECT r.*, 
           COUNT(DISTINCT ur.user_id) as user_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.role_key = ur.role_key
    GROUP BY r.id
    ORDER BY r.role_name
  `).all();
  res.json(roles);
});

// PATCH /api/admin-ext/roles/:id — Update role name/description/extensions
router.patch("/roles/:id", [
  body("role_name").optional().trim().notEmpty(),
  body("description").optional().trim(),
  body("allowed_file_extensions").optional().trim(),
], auditLog("role", "update", (req) => req.params.id), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Nieprawidłowe dane" });

  const { id } = req.params;
  const updates = {};
  
  if (req.body.role_name !== undefined) updates.role_name = req.body.role_name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.allowed_file_extensions !== undefined) updates.allowed_file_extensions = req.body.allowed_file_extensions;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Brak danych do aktualizacji" });
  }

  const setParts = Object.keys(updates).map(k => `${k} = ?`).join(", ");
  const values = [...Object.values(updates), id];

  const result = db.prepare(`UPDATE roles SET ${setParts} WHERE id = ?`).run(...values);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: "Rola nie znaleziona" });
  }

  const updated = db.prepare("SELECT * FROM roles WHERE id = ?").get(id);
  res.json(updated);
});

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT TEMPLATES MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin-ext/templates — List all templates
router.get("/templates", (req, res) => {
  const templates = db.prepare(`
    SELECT pt.*,
           COUNT(DISTINCT tf.id) as field_count,
           COUNT(DISTINCT o.id) as order_count
    FROM product_templates pt
    LEFT JOIN template_fields tf ON pt.id = tf.template_id
    LEFT JOIN orders o ON pt.id = o.template_id
    GROUP BY pt.id
    ORDER BY pt.name
  `).all();
  res.json(templates);
});

// GET /api/admin-ext/templates/:id — Get template with fields
router.get("/templates/:id", (req, res) => {
  const template = db.prepare("SELECT * FROM product_templates WHERE id = ?").get(req.params.id);
  if (!template) return res.status(404).json({ error: "Szablon nie znaleziony" });

  const fields = db.prepare(`
    SELECT * FROM template_fields 
    WHERE template_id = ? 
    ORDER BY sort_order, field_key
  `).all(req.params.id);

  res.json({ ...template, fields });
});

// POST /api/admin-ext/templates — Create new template
router.post("/templates", [
  body("name").trim().notEmpty(),
  body("description").optional().trim(),
  body("fields").optional().isArray(),
], auditLog("template", "create", (req, data) => data.id), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Nieprawidłowe dane" });

  const templateId = uuidv4();
  const { name, description, fields } = req.body;

  try {
    db.prepare(`
      INSERT INTO product_templates (id, name, description)
      VALUES (?, ?, ?)
    `).run(templateId, name, description || null);

    if (fields && fields.length > 0) {
      const insertField = db.prepare(`
        INSERT INTO template_fields (id, template_id, field_key, label, field_type, is_required, options, validation, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const field of fields) {
        insertField.run(
          uuidv4(),
          templateId,
          field.field_key,
          field.label,
          field.field_type || 'text',
          field.is_required ? 1 : 0,
          field.options || null,
          field.validation || null,
          field.sort_order || 0
        );
      }
    }

    const created = db.prepare("SELECT * FROM product_templates WHERE id = ?").get(templateId);
    const createdFields = db.prepare("SELECT * FROM template_fields WHERE template_id = ?").all(templateId);

    res.status(201).json({ ...created, fields: createdFields, id: templateId });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Szablon o tej nazwie już istnieje" });
    }
    res.status(500).json({ error: "Błąd podczas tworzenia szablonu" });
  }
});

// PATCH /api/admin-ext/templates/:id — Update template
router.patch("/templates/:id", [
  body("name").optional().trim().notEmpty(),
  body("description").optional().trim(),
  body("is_active").optional().isBoolean(),
], auditLog("template", "update", (req) => req.params.id), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Nieprawidłowe dane" });

  const { id } = req.params;
  const updates = {};
  
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.is_active !== undefined) updates.is_active = req.body.is_active ? 1 : 0;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Brak danych do aktualizacji" });
  }

  const setParts = Object.keys(updates).map(k => `${k} = ?`).join(", ");
  const values = [...Object.values(updates), id];

  const result = db.prepare(`UPDATE product_templates SET ${setParts}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: "Szablon nie znaleziony" });
  }

  const updated = db.prepare("SELECT * FROM product_templates WHERE id = ?").get(id);
  res.json(updated);
});

// POST /api/admin-ext/templates/:id/fields — Add field to template
router.post("/templates/:id/fields", [
  body("field_key").trim().notEmpty(),
  body("label").trim().notEmpty(),
  body("field_type").trim().notEmpty(),
  body("is_required").optional().isBoolean(),
  body("options").optional().trim(),
  body("validation").optional().trim(),
  body("sort_order").optional().isInt(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Nieprawidłowe dane" });

  const { id } = req.params;
  const template = db.prepare("SELECT * FROM product_templates WHERE id = ?").get(id);
  if (!template) return res.status(404).json({ error: "Szablon nie znaleziony" });

  const fieldId = uuidv4();
  const { field_key, label, field_type, is_required, options, validation, sort_order } = req.body;

  try {
    db.prepare(`
      INSERT INTO template_fields (id, template_id, field_key, label, field_type, is_required, options, validation, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fieldId,
      id,
      field_key,
      label,
      field_type,
      is_required ? 1 : 0,
      options || null,
      validation || null,
      sort_order || 0
    );

    const created = db.prepare("SELECT * FROM template_fields WHERE id = ?").get(fieldId);
    res.status(201).json(created);
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Pole o tym kluczu już istnieje w szablonie" });
    }
    res.status(500).json({ error: "Błąd podczas dodawania pola" });
  }
});

// DELETE /api/admin-ext/templates/:templateId/fields/:fieldId — Remove field
router.delete("/templates/:templateId/fields/:fieldId", (req, res) => {
  const result = db.prepare("DELETE FROM template_fields WHERE id = ? AND template_id = ?")
    .run(req.params.fieldId, req.params.templateId);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: "Pole nie znalezione" });
  }

  res.json({ message: "Pole usunięte" });
});

// ═══════════════════════════════════════════════════════════════════════════
// USER STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/admin-ext/users/:id/stats — Get user work statistics
router.get("/users/:id/stats", (req, res) => {
  const user = db.prepare("SELECT id, full_name FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Użytkownik nie znaleziony" });

  // Overall statistics
  const overall = db.prepare(`
    SELECT 
      COUNT(*) as total_tasks,
      COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_tasks,
      COUNT(CASE WHEN was_rejected = 1 THEN 1 END) as rejected_tasks,
      AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds END) as avg_duration_seconds
    FROM work_statistics
    WHERE user_id = ?
  `).get(req.params.id);

  // Per role breakdown
  const byRole = db.prepare(`
    SELECT 
      role_key,
      COUNT(*) as total_tasks,
      COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_tasks,
      COUNT(CASE WHEN was_rejected = 1 THEN 1 END) as rejected_tasks,
      AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds END) as avg_duration_seconds
    FROM work_statistics
    WHERE user_id = ?
    GROUP BY role_key
  `).all(req.params.id);

  // Recent work
  const recentWork = db.prepare(`
    SELECT 
      ws.*,
      o.order_number,
      o.product_type
    FROM work_statistics ws
    JOIN orders o ON ws.order_id = o.id
    WHERE ws.user_id = ?
    ORDER BY ws.created_at DESC
    LIMIT 20
  `).all(req.params.id);

  res.json({
    user,
    overall,
    by_role: byRole,
    recent_work: recentWork
  });
});

// GET /api/admin-ext/leaderboard — Get user performance leaderboard
router.get("/leaderboard", (req, res) => {
  const period = req.query.period || 'all'; // all, month, week
  
  let dateFilter = '';
  if (period === 'month') {
    dateFilter = "AND ws.created_at >= datetime('now', '-30 days')";
  } else if (period === 'week') {
    dateFilter = "AND ws.created_at >= datetime('now', '-7 days')";
  }

  const leaderboard = db.prepare(`
    SELECT 
      u.id,
      u.full_name,
      COUNT(DISTINCT ws.order_id) as total_orders,
      COUNT(CASE WHEN ws.completed_at IS NOT NULL THEN 1 END) as completed_tasks,
      COUNT(CASE WHEN ws.was_rejected = 1 THEN 1 END) as rejected_tasks,
      AVG(CASE WHEN ws.duration_seconds IS NOT NULL THEN ws.duration_seconds END) as avg_duration_seconds,
      ROUND(
        CAST(COUNT(CASE WHEN ws.completed_at IS NOT NULL THEN 1 END) AS FLOAT) / 
        NULLIF(COUNT(*), 0) * 100, 
        2
      ) as completion_rate
    FROM users u
    LEFT JOIN work_statistics ws ON u.id = ws.user_id ${dateFilter}
    GROUP BY u.id
    HAVING total_orders > 0
    ORDER BY completed_tasks DESC, avg_duration_seconds ASC
    LIMIT 50
  `).all();

  res.json(leaderboard);
});

module.exports = router;
