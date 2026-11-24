const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

async function logAudit({ eventId = null, actorId = null, actorRole = 'system', action, details = {}, ip = '127.0.0.1' }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, event_id, actor_id, actor_role, action, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(),
        eventId,
        actorId,
        actorRole,
        action,
        typeof details === 'object' ? JSON.stringify(details) : details,
        ip
      ]
    );
  } catch (err) {
    console.error('[AuditLog Error]:', err.message);
  }
}

module.exports = {
  logAudit
};
