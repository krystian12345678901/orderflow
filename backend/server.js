// server.js — OrderFlow API Server
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// ── SECURITY MIDDLEWARE ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS: development = localhost:5173, production = same origin
const corsOrigin = process.env.NODE_ENV === "production" 
  ? true  // Same origin when serving from same server
  : (process.env.FRONTEND_URL || "http://localhost:5173");

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use("/api/auth",         require("./src/routes/auth"));
app.use("/api/users",        require("./src/routes/users"));
app.use("/api/orders",       require("./src/routes/orders"));
app.use("/api/files/orders", require("./src/routes/files"));
app.use("/api/admin",        require("./src/routes/admin"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), version: "1.0.0" });
});

// Serve uploaded files (in production use S3 + signed URLs)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── PRODUCTION: Serve Frontend ───────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/dist");
  app.use(express.static(frontendPath));
  
  // Wszystkie inne ścieżki (nie /api/*) -> index.html (SPA routing)
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}


// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Zbyt duży plik" });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" ? "Błąd serwera" : err.message
  });
});

// ── START ─────────────────────────────────────────────────────────────────────
const { restoreTimeouts } = require("./src/workers/timeout");

app.listen(PORT, () => {
  console.log(`\n🚀 OrderFlow API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}\n`);
  restoreTimeouts();
});

module.exports = app;
