// src/routes/files.js
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const authenticate = require("../middleware/authenticate");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".docx", ".doc", ".txt", ".ai", ".psd", ".indd",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
  ".zip", ".rar", ".7z", ".xlsx", ".csv",
]);

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB default

const ROLES_CAN_UPLOAD = new Set(["administrator", "office_employee", "editor", "illustrator", "graphic_designer", "printer"]);

function getUploadStage(role, orderStatus) {
  const stageMap = {
    office_employee: "office",
    editor:          "editor",
    illustrator:     "illustrator",
    graphic_designer:"designer",
    printer:         "printer",
    administrator:   "admin",
  };
  return stageMap[role] || "unknown";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orderId = req.params.orderId;
    const dir = path.join(UPLOAD_DIR, orderId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`Niedozwolone rozszerzenie pliku: ${ext}`));
    }

    // Check role-specific allowed extensions from config
    const roleConfig = db.prepare(`
      SELECT allowed_extensions FROM form_field_configs
      WHERE role = ? AND field_type = 'file' AND is_active = 1
      LIMIT 1
    `).get(req.user?.role);

    if (roleConfig?.allowed_extensions) {
      const allowed = roleConfig.allowed_extensions.split(",").map(e => e.trim().toLowerCase());
      if (!allowed.includes(ext)) {
        return cb(new Error(`Niedozwolone rozszerzenie dla roli ${req.user?.role}: ${ext}`));
      }
    }

    cb(null, true);
  },
});

// POST /api/orders/:orderId/files
router.post("/:orderId", authenticate, (req, res) => {
  if (!ROLES_CAN_UPLOAD.has(req.user.role)) {
    return res.status(403).json({ error: "Brak uprawnień do wgrywania plików" });
  }

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.orderId);
  if (!order) return res.status(404).json({ error: "Zlecenie nie znalezione" });

  // Worker can only upload for orders they hold
  if (["editor", "illustrator", "graphic_designer", "printer"].includes(req.user.role)) {
    if (order.current_holder_id !== req.user.id) {
      return res.status(403).json({ error: "Możesz wgrywać pliki tylko do aktywnego zlecenia" });
    }
  }

  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Brak pliku w żądaniu" });
    }

    const fileId = uuidv4();
    const stage = getUploadStage(req.user.role, order.status);

    db.prepare(`
      INSERT INTO order_files (id, order_id, uploaded_by, stage, file_name, original_name, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fileId, order.id, req.user.id, stage,
      req.file.filename, req.file.originalname,
      req.file.size, req.file.mimetype
    );

    const fileRecord = db.prepare(`
      SELECT f.*, u.full_name as uploader_name
      FROM order_files f JOIN users u ON f.uploaded_by = u.id
      WHERE f.id = ?
    `).get(fileId);

    res.status(201).json(fileRecord);
  });
});

// GET /api/orders/:orderId/files
router.get("/:orderId", authenticate, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.orderId);
  if (!order) return res.status(404).json({ error: "Zlecenie nie znalezione" });

  const files = db.prepare(`
    SELECT f.*, u.full_name as uploader_name
    FROM order_files f JOIN users u ON f.uploaded_by = u.id
    WHERE f.order_id = ?
    ORDER BY f.created_at ASC
  `).all(req.params.orderId);

  res.json(files);
});

// GET /api/orders/:orderId/files/:fileId/download
router.get("/:orderId/files/:fileId/download", authenticate, (req, res) => {
  const file = db.prepare("SELECT * FROM order_files WHERE id = ? AND order_id = ?").get(req.params.fileId, req.params.orderId);
  if (!file) return res.status(404).json({ error: "Plik nie znaleziony" });

  const filePath = path.join(UPLOAD_DIR, req.params.orderId, file.file_name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Plik fizycznie nie istnieje" });
  }

  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.original_name)}"`);
  res.setHeader("Content-Type", file.mime_type);
  res.sendFile(filePath);
});

// DELETE /api/orders/:orderId/files/:fileId
router.delete("/:orderId/files/:fileId", authenticate, (req, res) => {
  if (!["administrator", "office_employee"].includes(req.user.role)) {
    return res.status(403).json({ error: "Brak uprawnień" });
  }

  const file = db.prepare("SELECT * FROM order_files WHERE id = ? AND order_id = ?").get(req.params.fileId, req.params.orderId);
  if (!file) return res.status(404).json({ error: "Plik nie znaleziony" });

  const filePath = path.join(UPLOAD_DIR, req.params.orderId, file.file_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare("DELETE FROM order_files WHERE id = ?").run(file.id);
  res.json({ message: "Plik usunięty" });
});

module.exports = router;
