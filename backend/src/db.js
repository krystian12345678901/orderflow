// src/db.js — SQLite database initialization
const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const DB_PATH = path.join(__dirname, "../data/orderflow.db");
const fs = require("fs");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── SCHEMA ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    role_key TEXT UNIQUE NOT NULL,
    role_name TEXT NOT NULL,
    description TEXT,
    allowed_file_extensions TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL REFERENCES roles(role_key) ON DELETE CASCADE,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, role_key)
  );

  CREATE TABLE IF NOT EXISTS product_templates (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS template_fields (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'text',
    is_required INTEGER NOT NULL DEFAULT 0,
    options TEXT,
    validation TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(template_id, field_key)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    template_id TEXT REFERENCES product_templates(id),
    product_type TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    client_notes TEXT,
    custom_fields TEXT,
    created_by TEXT NOT NULL REFERENCES users(id),
    current_holder_id TEXT REFERENCES users(id),
    previous_holder_id TEXT REFERENCES users(id),
    claimed_at TEXT,
    timeout_at TEXT,
    tracking_number TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_history (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT REFERENCES users(id),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_files (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    stage TEXT NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS work_statistics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    order_id TEXT NOT NULL REFERENCES orders(id),
    role_key TEXT NOT NULL,
    stage TEXT NOT NULL,
    claimed_at TEXT NOT NULL,
    completed_at TEXT,
    duration_seconds INTEGER,
    was_rejected INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, order_id, stage)
  );

  CREATE TABLE IF NOT EXISTS form_field_configs (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'text',
    is_required INTEGER NOT NULL DEFAULT 0,
    options TEXT,
    allowed_extensions TEXT,
    max_file_size_mb INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT REFERENCES users(id),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_holder ON orders(current_holder_id);
  CREATE INDEX IF NOT EXISTS idx_orders_template ON orders(template_id);
  CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_history(order_id);
  CREATE INDEX IF NOT EXISTS idx_files_order ON order_files(order_id);
  CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
  CREATE INDEX IF NOT EXISTS idx_work_stats_user ON work_statistics(user_id);
  CREATE INDEX IF NOT EXISTS idx_work_stats_order ON work_statistics(order_id);
`);

// ── SEED ──────────────────────────────────────────────────────────────────────
function seed() {
  const existingUsers = db.prepare("SELECT COUNT(*) as count FROM users").get();
  if (existingUsers.count > 0) return;

  // 1. Create roles
  const roles = [
    { key: "administrator",    name: "Administrator",        description: "Pełny dostęp do systemu",       extensions: "" },
    { key: "office_employee",  name: "Pracownik biura",      description: "Tworzenie i zarządzanie zleceniami", extensions: ".jpg,.jpeg,.png,.pdf,.docx,.zip" },
    { key: "editor",           name: "Redaktor",             description: "Redakcja treści",               extensions: ".pdf,.docx,.doc,.txt" },
    { key: "quality_control",  name: "Kontrola jakości",     description: "Weryfikacja i zatwierdzanie",   extensions: "" },
    { key: "illustrator",      name: "Ilustrator",           description: "Tworzenie ilustracji",          extensions: ".ai,.psd,.pdf,.png,.svg,.jpg" },
    { key: "graphic_designer", name: "Grafik",               description: "Projektowanie graficzne",       extensions: ".ai,.psd,.indd,.pdf,.png,.jpg" },
    { key: "printer",          name: "Drukarz",              description: "Przygotowanie do druku",        extensions: ".pdf" },
  ];

  const insertRole = db.prepare(`
    INSERT INTO roles (id, role_key, role_name, description, allowed_file_extensions) 
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const r of roles) {
    insertRole.run(uuidv4(), r.key, r.name, r.description, r.extensions);
  }

  // 2. Create users
  const users = [
    { email: "admin@firma.pl",      password: "Admin123!", roles: ["administrator", "office_employee"], name: "Anna Kowalska" },
    { email: "biuro@firma.pl",      password: "Biuro123!", roles: ["office_employee"],  name: "Marek Nowak" },
    { email: "redaktor@firma.pl",   password: "Red123!",   roles: ["editor"],           name: "Piotr Wiśniewski" },
    { email: "qc@firma.pl",         password: "QC1234!",   roles: ["quality_control"],  name: "Kasia Zielińska" },
    { email: "ilustrator@firma.pl", password: "Ilu123!",   roles: ["illustrator"],      name: "Tomek Jabłoński" },
    { email: "grafik@firma.pl",     password: "Graf123!",  roles: ["graphic_designer"], name: "Ewa Mazur" },
    { email: "druk@firma.pl",       password: "Druk123!",  roles: ["printer"],          name: "Jan Kowalczyk" },
    { email: "multi@firma.pl",      password: "Multi123!", roles: ["editor", "illustrator"], name: "Zofia Lewandowska" },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)
  `);
  const insertUserRole = db.prepare(`
    INSERT INTO user_roles (user_id, role_key) VALUES (?, ?)
  `);
  
  for (const u of users) {
    const userId = uuidv4();
    insertUser.run(userId, u.email, bcrypt.hashSync(u.password, 12), u.name);
    for (const roleKey of u.roles) {
      insertUserRole.run(userId, roleKey);
    }
  }

  // 3. Create product templates
  const templates = [
    { name: "Książka", description: "Standardowy szablon dla książek" },
    { name: "Magazyn", description: "Szablon dla magazynów i czasopism" },
    { name: "Plakat", description: "Szablon dla plakatów reklamowych" },
    { name: "Ulotka", description: "Szablon dla ulotek i materiałów marketingowych" },
  ];

  const insertTemplate = db.prepare(`
    INSERT INTO product_templates (id, name, description) VALUES (?, ?, ?)
  `);
  const insertField = db.prepare(`
    INSERT INTO template_fields (id, template_id, field_key, label, field_type, is_required, options, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of templates) {
    const templateId = uuidv4();
    insertTemplate.run(templateId, t.name, t.description);
    
    // Common fields for all templates
    const commonFields = [
      ["format", "Format", "select", 1, "A4,A5,A3,B5", 0],
      ["pages", "Liczba stron", "number", 1, null, 1],
      ["color", "Kolor", "select", 1, "CMYK,RGB,Grayscale", 2],
    ];

    // Template-specific fields
    if (t.name === "Książka") {
      commonFields.push(["isbn", "ISBN", "text", 0, null, 3]);
      commonFields.push(["binding", "Oprawa", "select", 1, "Miękka,Twarda,Spiralna", 4]);
    } else if (t.name === "Magazyn") {
      commonFields.push(["issue", "Numer wydania", "text", 1, null, 3]);
      commonFields.push(["frequency", "Częstotliwość", "select", 1, "Tygodnik,Miesięcznik,Kwartalnik", 4]);
    } else if (t.name === "Plakat") {
      commonFields.push(["size", "Rozmiar", "select", 1, "50x70,70x100,100x140", 3]);
      commonFields.push(["paper", "Papier", "select", 1, "Mat,Połysk,Kredowy", 4]);
    }

    for (const [key, label, type, req, opts, sort] of commonFields) {
      insertField.run(uuidv4(), templateId, key, label, type, req, opts, sort);
    }
  }

  // 4. Sample form field configs (legacy support)
  const insertConfig = db.prepare(`
    INSERT INTO form_field_configs (id, role, field_key, label, field_type, is_required, allowed_extensions, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const configs = [
    ["editor",           "processed_file", "Plik po redakcji",   "file", 1, ".pdf,.docx,.txt", 0],
    ["illustrator",      "illustration",   "Plik ilustracji",    "file", 1, ".ai,.pdf,.png,.svg", 0],
    ["graphic_designer", "design_file",    "Plik projektu",      "file", 1, ".ai,.pdf,.indd,.png", 0],
    ["printer",          "print_ready",    "Plik do druku",      "file", 1, ".pdf", 0],
  ];
  for (const [role, key, label, type, req, ext, sort] of configs) {
    insertConfig.run(uuidv4(), role, key, label, type, req, ext, sort);
  }

  console.log("✅ Database seeded with roles, users, templates");
  console.log("   admin@firma.pl / Admin123! (Administrator + Biuro)");
  console.log("   biuro@firma.pl / Biuro123!");
  console.log("   redaktor@firma.pl / Red123!");
  console.log("   qc@firma.pl / QC1234!");
  console.log("   ilustrator@firma.pl / Ilu123!");
  console.log("   grafik@firma.pl / Graf123!");
  console.log("   druk@firma.pl / Druk123!");
  console.log("   multi@firma.pl / Multi123! (Redaktor + Ilustrator)");
}

seed();

module.exports = db;
