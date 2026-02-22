// src/routes/orders.js
const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const sm = require("../state-machine");
const { scheduleTimeout, cancelTimeout } = require("../workers/timeout");

const PII_FIELDS = ["client_name", "client_email", "client_phone", "client_notes"];
const ROLES_WITH_PII = ["administrator", "office_employee", "quality_control"];

function sanitizeOrder(order, role) {
  if (ROLES_WITH_PII.includes(role)) return order;
  const safe = { ...order };
  PII_FIELDS.forEach(f => { safe[f] = undefined; });
  return safe;
}

function getOrderWithDetails(id) {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!order) return null;

  const history = db.prepare(`
    SELECT oh.*, u.full_name as actor_name
    FROM order_history oh
    LEFT JOIN users u ON oh.actor_id = u.id
    WHERE oh.order_id = ?
    ORDER BY oh.created_at ASC
  `).all(id);

  const files = db.prepare(`
    SELECT f.*, u.full_name as uploader_name
    FROM order_files f
    JOIN users u ON f.uploaded_by = u.id
    WHERE f.order_id = ?
    ORDER BY f.created_at ASC
  `).all(id);

  return { ...order, history, files };
}

// Generate order number
function nextOrderNumber() {
  const count = db.prepare("SELECT COUNT(*) as c FROM orders").get().c;
  const year = new Date().getFullYear();
  return `ZL-${year}-${String(count + 1).padStart(4, "0")}`;
}

// ── LIST ORDERS ───────────────────────────────────────────────────────────────
router.get("/", authenticate, (req, res) => {
  const { role, id } = req.user;
  const { status, page = 1, limit = 50 } = req.query;

  let sql = "SELECT o.*, u.full_name as holder_name FROM orders o LEFT JOIN users u ON o.current_holder_id = u.id WHERE 1=1";
  const params = [];

  // Role-based filtering
  if (role === "office_employee") {
    sql += " AND o.created_by = ?"; params.push(id);
  } else if (role === "editor") {
    sql += " AND (o.status = 'editor_pool' OR o.current_holder_id = ?)"; params.push(id);
  } else if (role === "illustrator") {
    sql += " AND (o.status = 'illustrator_pool' OR o.current_holder_id = ?)"; params.push(id);
  } else if (role === "graphic_designer") {
    sql += " AND (o.status = 'designer_pool' OR o.current_holder_id = ?)"; params.push(id);
  } else if (role === "printer") {
    sql += " AND (o.status = 'printer_pool' OR o.current_holder_id = ?)"; params.push(id);
  } else if (role === "quality_control") {
    // QC sees all orders
  }
  // administrator sees all

  if (status) { sql += " AND o.status = ?"; params.push(status); }

  sql += " ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const orders = db.prepare(sql).all(...params).map(o => sanitizeOrder(o, role));
  const total = db.prepare("SELECT COUNT(*) as c FROM orders").get().c;
  res.json({ orders, total, page: Number(page), limit: Number(limit) });
});

// ── GET SINGLE ORDER ──────────────────────────────────────────────────────────
router.get("/:id", authenticate, (req, res) => {
  const order = getOrderWithDetails(req.params.id);
  if (!order) return res.status(404).json({ error: "Zlecenie nie znalezione" });
  res.json(sanitizeOrder(order, req.user.role));
});

// ── CREATE ORDER ──────────────────────────────────────────────────────────────
router.post("/", authenticate, authorize("administrator", "office_employee"), [
  body("clientName").trim().notEmpty(),
  body("productType").trim().notEmpty(),
  body("clientEmail").optional().isEmail(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { clientName, clientEmail, clientPhone, productType, clientNotes } = req.body;
  const id = uuidv4();
  const orderNumber = nextOrderNumber();

  db.prepare(`
    INSERT INTO orders (id, order_number, status, client_name, client_email, client_phone, product_type, client_notes, created_by)
    VALUES (?, ?, 'created', ?, ?, ?, ?, ?, ?)
  `).run(id, orderNumber, clientName, clientEmail || null, clientPhone || null, productType, clientNotes || null, req.user.id);

  db.prepare(`
    INSERT INTO order_history (id, order_id, from_status, to_status, action, actor_id, notes)
    VALUES (?, ?, 'created', 'created', 'create', ?, ?)
  `).run(uuidv4(), id, req.user.id, "Zlecenie utworzone");

  res.status(201).json(getOrderWithDetails(id));
});

// ── SUBMIT ORDER INTO WORKFLOW ────────────────────────────────────────────────
router.post("/:id/submit", authenticate, authorize("administrator", "office_employee"), (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Zlecenie nie znalezione" });

  const nextStatus = sm.getNextStatus(order.status, "submit");
  if (!nextStatus) return res.status(400).json({ error: `Nie można złożyć zlecenia ze statusu: ${order.status}` });

  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(nextStatus, order.id);
  db.prepare(`
    INSERT INTO order_history (id, order_id, from_status, to_status, action, actor_id, notes)
    VALUES (?, ?, ?, ?, 'submit', ?, ?)
  `).run(uuidv4(), order.id, order.status, nextStatus, req.user.id, req.body.notes || null);

  res.json(getOrderWithDetails(order.id));
});

// ── TRANSITION: CLAIM ─────────────────────────────────────────────────────────
router.post("/:id/claim", authenticate, authorize("editor", "illustrator", "graphic_designer", "printer"), (req, res) => {
  const { role, id: userId } = req.user;
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Zlecenie nie znalezione" });

  if (order.status !== sm.ROLE_POOL[role]) {
    return res.status(400).json({ error: "Zlecenie nie jest w Twojej puli" });
  }
  if (order.current_holder_id) {
    return res.status(409).json({ error: "Zlecenie już przejęte przez kogoś innego" });
  }

  // Check if user already has active order
  const activeOrder = db.prepare("SELECT id FROM orders WHERE current_holder_id = ? AND status = ?").get(userId, sm.ROLE_PROCESSING[role]);
  if (activeOrder) {
    return res.status(409).json({ error: "Masz już aktywne zlecenie. Zakończ je najpierw." });
  }

  const nextStatus = sm.ROLE_PROCESSING[role];
  const timeoutAt = new Date(Date.now() + sm.TIMEOUT_SECONDS * 1000).toISOString();

  db.prepare(`
    UPDATE orders SET status = ?, current_holder_id = ?, claimed_at = datetime('now'), timeout_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(nextStatus, userId, timeoutAt, order.id);

  db.prepare(`
    INSERT INTO order_history (id, order_id, from_status, to_status, action, actor_id)
    VALUES (?, ?, ?, ?, 'claim', ?)
  `).run(uuidv4(), order.id, order.status, nextStatus, userId);

  scheduleTimeout(order.id, nextStatus);

  res.json(getOrderWithDetails(order.id));
});

// ── TRANSITION: COMPLETE ──────────────────────────────────────────────────────
router.post("/:id/complete", authenticate, authorize("editor", "illustrator", "graphic_designer", "printer"), (req, res) => {
  const { role, id: userId } = req.user;
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Zlecenie nie znalezione" });

  if (order.current_holder_id !== userId) {
    return res.status(403).json({ error: "To zlecenie nie jest przypisane do Ciebie" });
  }

  const nextStatus = sm.getNextStatus(order.status, "complete");
  if (!nextStatus) return res.status(400).json({ error: "Nie można zakończyć tego zlecenia" });

  const trackingNumber = role === "printer" ? (req.body.trackingNumber || null) : order.tracking_number;

  db.prepare(`
    UPDATE orders SET status = ?, current_holder_id = NULL, claimed_at = NULL, timeout_at = NULL,
    tracking_number = COALESCE(?, tracking_number), updated_at = datetime('now')
    WHERE id = ?
  `).run(nextStatus, trackingNumber, order.id);

  db.prepare(`
    INSERT INTO order_history (id, order_id, from_status, to_status, action, actor_id, notes)
    VALUES (?, ?, ?, ?, 'complete', ?, ?)
  `).run(uuidv4(), order.id, order.status, nextStatus, userId, req.body.notes || null);

  cancelTimeout(order.id);
  res.json(getOrderWithDetails(order.id));
});

// ── TRANSITION: REJECT (by worker) ───────────────────────────────────────────
router.post("/:id/reject", authenticate, authorize("editor", "illustrator", "graphic_designer", "printer"), (req, res) => {
  const { id: userId } = req.user;
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Zlecenie nie znalezione" });

  if (order.current_holder_id !== userId) {
    return res.status(403).json({ error: "To zlecenie nie jest przypisane do Ciebie" });
  }

  const nextStatus = sm.getNextStatus(order.status, "reject");
  if (!nextStatus) return res.status(400).json({ error: "Nie można odrzucić" });

  db.prepare(`
    UPDATE orders SET status = ?, current_holder_id = NULL, claimed_at = NULL, timeout_at = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(nextStatus, order.id);

  db.prepare(`
    INSERT INTO order_history (id, order_id, from_status, to_status, action, actor_id, notes)
    VALUES (?, ?, ?, ?, 'reject', ?, ?)
  `).run(uuidv4(), order.id, order.status, nextStatus, userId, req.body.notes || "Odrzucono przez pracownika");

  cancelTimeout(order.id);
  res.json(getOrderWithDetails(order.id));
});

// ── TRANSITION: QC APPROVE ────────────────────────────────────────────────────
router.post("/:id/approve", authenticate, authorize("quality_control"), (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Zlecenie nie znalezione" });

  if (!sm.isQCState(order.status)) {
    return res.status(400).json({ error: "Zlecenie nie czeka na kontrolę jakości" });
  }

  const nextStatus = sm.getNextStatus(order.status, "approve");
  db.prepare(`
    UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(nextStatus, order.id);

  db.prepare(`
    INSERT INTO order_history (id, order_id, from_status, to_status, action, actor_id, notes)
    VALUES (?, ?, ?, ?, 'approve', ?, ?)
  `).run(uuidv4(), order.id, order.status, nextStatus, req.user.id, req.body.notes || null);

  res.json(getOrderWithDetails(order.id));
});

// ── TRANSITION: QC REJECT ─────────────────────────────────────────────────────
router.post("/:id/qc-reject", authenticate, authorize("quality_control"), (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Zlecenie nie znalezione" });

  if (!sm.isQCState(order.status)) {
    return res.status(400).json({ error: "Zlecenie nie czeka na kontrolę jakości" });
  }

  const nextStatus = sm.getNextStatus(order.status, "reject");
  db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(nextStatus, order.id);

  db.prepare(`
    INSERT INTO order_history (id, order_id, from_status, to_status, action, actor_id, notes)
    VALUES (?, ?, ?, ?, 'reject', ?, ?)
  `).run(uuidv4(), order.id, order.status, nextStatus, req.user.id, req.body.notes || "Odrzucono przez QC");

  res.json(getOrderWithDetails(order.id));
});

// ── CANCEL ORDER (Admin) ──────────────────────────────────────────────────────
router.post("/:id/cancel", authenticate, authorize("administrator"), (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Zlecenie nie znalezione" });

  if (["completed", "cancelled"].includes(order.status)) {
    return res.status(400).json({ error: "Nie można anulować zakończonego zlecenia" });
  }

  db.prepare(`
    UPDATE orders SET status = 'cancelled', current_holder_id = NULL, updated_at = datetime('now') WHERE id = ?
  `).run(order.id);

  db.prepare(`
    INSERT INTO order_history (id, order_id, from_status, to_status, action, actor_id, notes)
    VALUES (?, ?, ?, 'cancelled', 'cancel', ?, ?)
  `).run(uuidv4(), order.id, order.status, req.user.id, req.body.reason || "Anulowane przez administratora");

  cancelTimeout(order.id);
  res.json(getOrderWithDetails(order.id));
});

// ── GET HISTORY ───────────────────────────────────────────────────────────────
router.get("/:id/history", authenticate, authorize("administrator", "office_employee", "quality_control"), (req, res) => {
  const history = db.prepare(`
    SELECT oh.*, u.full_name as actor_name
    FROM order_history oh
    LEFT JOIN users u ON oh.actor_id = u.id
    WHERE oh.order_id = ?
    ORDER BY oh.created_at ASC
  `).all(req.params.id);
  res.json(history);
});

// ── POOLS ─────────────────────────────────────────────────────────────────────
router.get("/pool/:poolName", authenticate, (req, res) => {
  const poolMap = {
    editor:     ["editor", "administrator"],
    illustrator:["illustrator", "administrator"],
    designer:   ["graphic_designer", "administrator"],
    printer:    ["printer", "administrator"],
    qc:         ["quality_control", "administrator"],
  };
  const allowed = poolMap[req.params.poolName];
  if (!allowed) return res.status(404).json({ error: "Nieznana pula" });
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: "Brak dostępu" });

  const statusMap = {
    editor:     "editor_pool",
    illustrator:"illustrator_pool",
    designer:   "designer_pool",
    printer:    "printer_pool",
    qc:         ["qc_editor_review", "qc_illustrator_review", "qc_designer_review"],
  };

  const status = statusMap[req.params.poolName];
  let orders;
  if (Array.isArray(status)) {
    const placeholders = status.map(() => "?").join(",");
    orders = db.prepare(`SELECT * FROM orders WHERE status IN (${placeholders}) ORDER BY created_at ASC`).all(...status);
  } else {
    orders = db.prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at ASC").all(status);
  }

  res.json(orders.map(o => sanitizeOrder(o, req.user.role)));
});

module.exports = router;
