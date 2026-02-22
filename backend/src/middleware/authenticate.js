// src/middleware/authenticate.js
const { verifyAccessToken } = require("../auth");
const db = require("../db");

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Brak tokenu autoryzacji" });
  }
  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    const user = db.prepare("SELECT id, email, full_name, is_active FROM users WHERE id = ?").get(payload.sub);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: "Konto nieaktywne lub nie istnieje" });
    }
    
    // Load user roles
    const roles = db.prepare(`
      SELECT r.role_key, r.role_name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_key = r.role_key 
      WHERE ur.user_id = ? AND r.is_active = 1
    `).all(user.id);
    
    user.roles = roles.map(r => r.role_key);
    user.roleNames = roles.map(r => r.role_name);
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token wygasł lub jest nieprawidłowy" });
  }
}

module.exports = authenticate;
