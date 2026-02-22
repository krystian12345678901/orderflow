// src/auth.js — JWT helpers
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || "change-me-access-secret-in-production";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "change-me-refresh-secret-in-production";

const ACCESS_EXPIRES  = "15m";
const REFRESH_EXPIRES = "7d";
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  signAccessToken, signRefreshToken,
  verifyAccessToken, verifyRefreshToken,
  hashToken, REFRESH_EXPIRES_MS
};
