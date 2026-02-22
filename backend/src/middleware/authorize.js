// src/middleware/authorize.js
function authorize(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));
    if (!hasPermission) {
      return res.status(403).json({ error: "Brak uprawnień do tej operacji" });
    }
    next();
  };
}

// Helper to check if user has specific role
function hasRole(user, roleKey) {
  return user?.roles?.includes(roleKey) || false;
}

// Helper to check if user has any of the roles
function hasAnyRole(user, ...roleKeys) {
  return roleKeys.some(role => user?.roles?.includes(role)) || false;
}

module.exports = authorize;
module.exports.hasRole = hasRole;
module.exports.hasAnyRole = hasAnyRole;

// src/middleware/auditLog.js  (exported separately but placed here for brevity)
const db = require("../db");
const { v4: uuidv4 } = require("uuid");

function auditLog(entityType, action, getEntityId, getPayload) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      if (res.statusCode < 400) {
        try {
          const entityId = typeof getEntityId === "function" ? getEntityId(req, data) : getEntityId;
          db.prepare(`
            INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, payload, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            req.user?.id || null,
            entityType,
            entityId || "unknown",
            action,
            getPayload ? JSON.stringify(getPayload(req, data)) : null,
            req.ip
          );
        } catch (e) { /* non-blocking */ }
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports.auditLog = auditLog;
