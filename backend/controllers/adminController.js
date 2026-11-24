const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../utils/auditLogger');

// GET /api/admin/dashboard (Platform Overview & Analytics)
async function getAdminDashboard(req, res) {
  try {
    const orgCountRes = await db.query('SELECT COUNT(*) FROM organizers');
    const eventCountRes = await db.query('SELECT COUNT(*) FROM events WHERE is_deleted = FALSE');
    const liveEventsRes = await db.query("SELECT COUNT(*) FROM events WHERE status = 'live' AND is_deleted = FALSE");
    const partCountRes = await db.query('SELECT COUNT(*) FROM participants');
    const modSubCountRes = await db.query('SELECT COUNT(*) FROM modification_submissions');
    const debugSubCountRes = await db.query('SELECT COUNT(*) FROM debug_submissions');
    const execCountRes = await db.query('SELECT COUNT(*) FROM execution_runs');
    const abuseCountRes = await db.query("SELECT COUNT(*) FROM abuse_reports WHERE status = 'pending'");

    // Recent activity audit logs
    const recentLogsRes = await db.query(
      `SELECT al.*, e.name as event_name 
       FROM audit_logs al
       LEFT JOIN events e ON al.event_id = e.id
       ORDER BY al.created_at DESC LIMIT 10`
    );

    return success(res, {
      analytics: {
        totalOrganizers: parseInt(orgCountRes.rows[0].count, 10),
        totalContests: parseInt(eventCountRes.rows[0].count, 10),
        liveContests: parseInt(liveEventsRes.rows[0].count, 10),
        totalParticipants: parseInt(partCountRes.rows[0].count, 10),
        totalSubmissions: parseInt(modSubCountRes.rows[0].count, 10) + parseInt(debugSubCountRes.rows[0].count, 10),
        totalExecutionRuns: parseInt(execCountRes.rows[0].count, 10),
        pendingAbuseReports: parseInt(abuseCountRes.rows[0].count, 10)
      },
      recentLogs: recentLogsRes.rows
    });
  } catch (err) {
    console.error('[Admin Dashboard Error]:', err);
    return error(res, 'Failed to fetch admin dashboard.', 500, err.message);
  }
}

// GET /api/admin/organizers (List all organizers)
async function getAllOrganizers(req, res) {
  try {
    const result = await db.query(
      `SELECT 
        o.id, 
        o.full_name, 
        o.email, 
        o.organization, 
        o.is_active, 
        o.created_at,
        (SELECT COUNT(*) FROM events WHERE organizer_id = o.id AND is_deleted = FALSE)::int as contest_count
       FROM organizers o
       ORDER BY o.created_at DESC`
    );

    return success(res, { organizers: result.rows });
  } catch (err) {
    console.error('[Admin Organizers Error]:', err);
    return error(res, 'Failed to fetch organizers.', 500, err.message);
  }
}

// PATCH /api/admin/organizers/:id/status (Activate / Suspend Organizer)
async function setOrganizerStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active, reason } = req.body;

    await db.query(
      `UPDATE organizers SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [Boolean(is_active), id]
    );

    await logAudit({
      actorId: req.user.id,
      actorRole: 'admin',
      action: is_active ? 'ORGANIZER_ACTIVATED' : 'ORGANIZER_SUSPENDED',
      details: { organizerId: id, reason }
    });

    return success(res, null, `Organizer account ${is_active ? 'activated' : 'suspended'} successfully.`);
  } catch (err) {
    console.error('[Admin Set Status Error]:', err);
    return error(res, 'Failed to update organizer status.', 500, err.message);
  }
}

// GET /api/admin/contests (List all platform contests)
async function getAllContests(req, res) {
  try {
    const result = await db.query(
      `SELECT 
        e.*,
        o.full_name as organizer_name,
        o.email as organizer_email,
        (SELECT COUNT(*) FROM participants WHERE event_id = e.id)::int as participant_count
       FROM events e
       JOIN organizers o ON e.organizer_id = o.id
       ORDER BY e.created_at DESC`
    );

    return success(res, { contests: result.rows });
  } catch (err) {
    console.error('[Admin Contests Error]:', err);
    return error(res, 'Failed to fetch contests.', 500, err.message);
  }
}

// Abuse Reports
async function getAbuseReports(req, res) {
  try {
    const result = await db.query(
      `SELECT ar.*, e.name as event_name, o.full_name as organizer_name
       FROM abuse_reports ar
       JOIN events e ON ar.event_id = e.id
       JOIN organizers o ON e.organizer_id = o.id
       ORDER BY ar.created_at DESC`
    );

    return success(res, { reports: result.rows });
  } catch (err) {
    console.error('[Admin Abuse Reports Error]:', err);
    return error(res, 'Failed to fetch abuse reports.', 500, err.message);
  }
}

async function updateAbuseReport(req, res) {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    await db.query(
      `UPDATE abuse_reports SET
        status = COALESCE($1, status),
        admin_notes = COALESCE($2, admin_notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [status, admin_notes, id]
    );

    return success(res, null, 'Abuse report updated.');
  } catch (err) {
    console.error('[Update Abuse Report Error]:', err);
    return error(res, 'Failed to update abuse report.', 500, err.message);
  }
}

// Audit Logs
async function getAuditLogs(req, res) {
  try {
    const { limit = 50 } = req.query;
    const result = await db.query(
      `SELECT al.*, e.name as event_name 
       FROM audit_logs al
       LEFT JOIN events e ON al.event_id = e.id
       ORDER BY al.created_at DESC LIMIT $1`,
      [parseInt(limit, 10) || 50]
    );

    return success(res, { logs: result.rows });
  } catch (err) {
    console.error('[Get Audit Logs Error]:', err);
    return error(res, 'Failed to fetch audit logs.', 500, err.message);
  }
}

// Platform Settings
async function getPlatformSettings(req, res) {
  try {
    const result = await db.query(`SELECT * FROM platform_settings`);
    const settingsMap = {};
    for (const r of result.rows) {
      settingsMap[r.key] = r.value;
    }
    return success(res, { settings: settingsMap });
  } catch (err) {
    console.error('[Get Settings Error]:', err);
    return error(res, 'Failed to fetch settings.', 500, err.message);
  }
}

async function updatePlatformSettings(req, res) {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) return error(res, 'Key and value required.', 400);

    await db.query(
      `INSERT INTO platform_settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(value)]
    );

    return success(res, null, 'Setting saved successfully.');
  } catch (err) {
    console.error('[Update Setting Error]:', err);
    return error(res, 'Failed to save setting.', 500, err.message);
  }
}

module.exports = {
  getAdminDashboard,
  getAllOrganizers,
  setOrganizerStatus,
  getAllContests,
  getAbuseReports,
  updateAbuseReport,
  getAuditLogs,
  getPlatformSettings,
  updatePlatformSettings
};
