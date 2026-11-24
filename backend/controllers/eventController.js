const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../utils/auditLogger');
const { emitToContest } = require('../socket/socketManager');

// Helper to generate 6-digit random PIN
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET /api/events (List contests owned or co-organized by user)
async function getMyEvents(req, res) {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Fetch owned contests + co-organized contests
    const result = await db.query(
      `SELECT 
        e.*,
        o.full_name as organizer_name,
        (e.organizer_id = $1) as is_owner,
        om.permissions as member_permissions,
        (SELECT COUNT(*) FROM participants WHERE event_id = e.id AND status = 'active')::int as participant_count,
        (SELECT COUNT(*) FROM rounds WHERE event_id = e.id)::int as round_count,
        (SELECT COUNT(*) FROM modification_submissions ms WHERE ms.event_id = e.id)::int as mod_submission_count,
        (SELECT COUNT(*) FROM debug_submissions ds WHERE ds.event_id = e.id)::int as debug_submission_count
      FROM events e
      JOIN organizers o ON e.organizer_id = o.id
      LEFT JOIN organizer_members om ON om.event_id = e.id AND (om.organizer_id = $1 OR om.invited_email = $2) AND om.status = 'accepted'
      WHERE (e.organizer_id = $1 OR om.id IS NOT NULL) AND e.is_deleted = FALSE
      ORDER BY e.created_at DESC`,
      [userId, userEmail]
    );

    // Calculate organizer summary stats
    const contests = result.rows;
    const stats = {
      totalContests: contests.length,
      activeContests: contests.filter(c => c.status === 'live').length,
      upcomingContests: contests.filter(c => c.status === 'upcoming').length,
      completedContests: contests.filter(c => c.status === 'completed').length,
      totalParticipants: contests.reduce((sum, c) => sum + (c.participant_count || 0), 0),
      totalSubmissions: contests.reduce((sum, c) => sum + (c.mod_submission_count || 0) + (c.debug_submission_count || 0), 0)
    };

    return success(res, { contests, stats });
  } catch (err) {
    console.error('[Get Events Error]:', err);
    return error(res, 'Failed to fetch contests.', 500, err.message);
  }
}

// POST /api/events (Create Contest)
async function createEvent(req, res) {
  try {
    const {
      name,
      description,
      banner_url,
      visibility = 'public',
      allowed_languages = ['python', 'javascript', 'cpp', 'java', 'c'],
      max_participants = 100,
      reg_start,
      reg_end,
      start_time,
      end_time,
      total_rounds = 1,
      rules,
      scoring_config
    } = req.body;

    if (!name || !description || !start_time || !end_time) {
      return error(res, 'Contest name, description, start time, and end time are required.', 400);
    }

    const eventId = uuidv4();
    let rawPin = null;
    let pinHash = null;

    if (visibility === 'private') {
      rawPin = generatePin();
      pinHash = await bcrypt.hash(rawPin, 10);
    }

    const defaultScoring = scoring_config || { test_cases: 60, organizer_review: 20, explanation: 20 };

    await db.query(
      `INSERT INTO events (
        id, organizer_id, name, description, banner_url, visibility, pin_hash,
        allowed_languages, max_participants, reg_start, reg_end, start_time, end_time,
        total_rounds, rules, scoring_config, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'upcoming')`,
      [
        eventId,
        req.user.id,
        name.trim(),
        description.trim(),
        banner_url || null,
        visibility,
        pinHash,
        allowed_languages,
        parseInt(max_participants, 10) || 100,
        reg_start ? new Date(reg_start) : null,
        reg_end ? new Date(reg_end) : null,
        new Date(start_time),
        new Date(end_time),
        parseInt(total_rounds, 10) || 1,
        rules || null,
        JSON.stringify(defaultScoring)
      ]
    );

    // Auto-create Round 1 in preparation state
    const round1Id = uuidv4();
    await db.query(
      `INSERT INTO rounds (id, event_id, round_number, round_name, description, bug_intro_duration_minutes, debug_duration_minutes, status, scoring_config)
       VALUES ($1, $2, 1, 'Round 1: Initial Round', 'Preparation phase for code assignments and bug introduction.', 20, 30, 'preparation', $3)`,
      [round1Id, eventId, JSON.stringify(defaultScoring)]
    );

    await logAudit({
      eventId,
      actorId: req.user.id,
      actorRole: 'organizer',
      action: 'CONTEST_CREATED',
      details: { name, visibility }
    });

    return success(res, {
      id: eventId,
      name,
      visibility,
      pin: rawPin, // Provided only once on creation if private
      status: 'upcoming'
    }, 'Contest created successfully.', 201);
  } catch (err) {
    console.error('[Create Event Error]:', err);
    return error(res, 'Failed to create contest.', 500, err.message);
  }
}

// GET /api/events/:id (Overview & Details)
async function getEventById(req, res) {
  try {
    const { id } = req.params;

    const eventRes = await db.query(
      `SELECT 
        e.*,
        o.full_name as organizer_name,
        o.email as organizer_email,
        (SELECT COUNT(*) FROM participants WHERE event_id = e.id AND status = 'active')::int as participant_count,
        (SELECT COUNT(*) FROM code_blocks WHERE event_id = e.id)::int as code_block_count,
        (SELECT COUNT(*) FROM rounds WHERE event_id = e.id)::int as round_count,
        (SELECT COUNT(*) FROM organizer_members WHERE event_id = e.id)::int as co_organizer_count
       FROM events e
       JOIN organizers o ON e.organizer_id = o.id
       WHERE e.id = $1 AND e.is_deleted = FALSE`,
      [id]
    );

    if (eventRes.rows.length === 0) {
      return error(res, 'Contest not found.', 404);
    }

    const contest = eventRes.rows[0];

    // Get rounds for this contest
    const roundsRes = await db.query(
      `SELECT * FROM rounds WHERE event_id = $1 ORDER BY round_number ASC`,
      [id]
    );

    return success(res, {
      contest,
      rounds: roundsRes.rows,
      isOwner: req.isOwner,
      permissions: req.memberPermissions || null
    });
  } catch (err) {
    console.error('[Get Event Details Error]:', err);
    return error(res, 'Failed to fetch contest details.', 500, err.message);
  }
}

// PATCH /api/events/:id (Update eligible settings)
async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      banner_url,
      visibility,
      allowed_languages,
      max_participants,
      reg_start,
      reg_end,
      start_time,
      end_time,
      rules,
      status
    } = req.body;

    const existing = req.contest;

    // Check if contest is live; restrict structural changes
    if (existing.status === 'live' && (visibility !== undefined || allowed_languages !== undefined)) {
      return error(res, 'Cannot change visibility or languages while contest is live.', 400);
    }

    await db.query(
      `UPDATE events SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        banner_url = COALESCE($3, banner_url),
        visibility = COALESCE($4, visibility),
        allowed_languages = COALESCE($5, allowed_languages),
        max_participants = COALESCE($6, max_participants),
        reg_start = COALESCE($7, reg_start),
        reg_end = COALESCE($8, reg_end),
        start_time = COALESCE($9, start_time),
        end_time = COALESCE($10, end_time),
        rules = COALESCE($11, rules),
        status = COALESCE($12, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $13`,
      [
        name,
        description,
        banner_url,
        visibility,
        allowed_languages,
        max_participants ? parseInt(max_participants, 10) : null,
        reg_start ? new Date(reg_start) : null,
        reg_end ? new Date(reg_end) : null,
        start_time ? new Date(start_time) : null,
        end_time ? new Date(end_time) : null,
        rules,
        status,
        id
      ]
    );

    emitToContest(id, 'contest_updated', { eventId: id, status });

    await logAudit({
      eventId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CONTEST_UPDATED',
      details: req.body
    });

    return success(res, { id }, 'Contest updated successfully.');
  } catch (err) {
    console.error('[Update Event Error]:', err);
    return error(res, 'Failed to update contest.', 500, err.message);
  }
}

// DELETE /api/events/:id (Soft delete)
async function deleteEvent(req, res) {
  try {
    const { id } = req.params;

    if (!req.isOwner && req.user.role !== 'admin') {
      return error(res, 'Only the primary contest owner can delete this contest.', 403);
    }

    await db.query(`UPDATE events SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    await logAudit({
      eventId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CONTEST_DELETED',
      details: { id }
    });

    return success(res, null, 'Contest deleted successfully.');
  } catch (err) {
    console.error('[Delete Event Error]:', err);
    return error(res, 'Failed to delete contest.', 500, err.message);
  }
}

// POST /api/events/:id/archive
async function archiveEvent(req, res) {
  try {
    const { id } = req.params;

    await db.query(`UPDATE events SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    await logAudit({
      eventId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CONTEST_ARCHIVED',
      details: { id }
    });

    return success(res, null, 'Contest archived successfully.');
  } catch (err) {
    console.error('[Archive Event Error]:', err);
    return error(res, 'Failed to archive contest.', 500, err.message);
  }
}

// POST /api/events/:id/regenerate-pin
async function regeneratePin(req, res) {
  try {
    const { id } = req.params;
    const newPin = generatePin();
    const pinHash = await bcrypt.hash(newPin, 10);

    await db.query(
      `UPDATE events SET pin_hash = $1, visibility = 'private', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [pinHash, id]
    );

    await logAudit({
      eventId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'PIN_REGENERATED',
      details: { eventId: id }
    });

    return success(res, { pin: newPin }, 'Contest PIN regenerated successfully.');
  } catch (err) {
    console.error('[Regenerate PIN Error]:', err);
    return error(res, 'Failed to regenerate PIN.', 500, err.message);
  }
}

// Co-Organizer Operations
async function inviteCoOrganizer(req, res) {
  try {
    const { id } = req.params;
    const { email, permissions } = req.body;

    if (!email) return error(res, 'Email is required for invitation.', 400);

    // Find if user already exists as organizer
    const orgRes = await db.query(`SELECT id FROM organizers WHERE email = $1`, [email.toLowerCase().trim()]);
    const matchedOrgId = orgRes.rows[0]?.id || null;

    const defaultPerms = permissions || {
      view_contest: true,
      manage_participants: true,
      manage_code_blocks: true,
      manage_rounds: false,
      configure_assignments: true,
      configure_swaps: true,
      view_submissions: true,
      evaluate_submissions: true,
      manage_leaderboard: true,
      publish_results: false
    };

    const memberId = uuidv4();
    await db.query(
      `INSERT INTO organizer_members (id, event_id, organizer_id, invited_email, permissions, status)
       VALUES ($1, $2, $3, $4, $5, 'accepted')
       ON CONFLICT (event_id, invited_email)
       DO UPDATE SET permissions = EXCLUDED.permissions, status = 'accepted'`,
      [memberId, id, matchedOrgId, email.toLowerCase().trim(), JSON.stringify(defaultPerms)]
    );

    await logAudit({
      eventId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'CO_ORGANIZER_INVITED',
      details: { email, permissions: defaultPerms }
    });

    return success(res, { memberId, email, permissions: defaultPerms }, 'Co-organizer added successfully.', 201);
  } catch (err) {
    console.error('[Invite Co-Organizer Error]:', err);
    return error(res, 'Failed to invite co-organizer.', 500, err.message);
  }
}

async function getCoOrganizers(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT om.*, o.full_name, o.organization 
       FROM organizer_members om
       LEFT JOIN organizers o ON om.organizer_id = o.id
       WHERE om.event_id = $1 ORDER BY om.created_at ASC`,
      [id]
    );

    return success(res, { coOrganizers: result.rows });
  } catch (err) {
    console.error('[Get Co-Organizers Error]:', err);
    return error(res, 'Failed to fetch co-organizers.', 500, err.message);
  }
}

async function updateCoOrganizer(req, res) {
  try {
    const { id, memberId } = req.params;
    const { permissions, status } = req.body;

    await db.query(
      `UPDATE organizer_members SET
        permissions = COALESCE($1, permissions),
        status = COALESCE($2, status)
       WHERE id = $3 AND event_id = $4`,
      [permissions ? JSON.stringify(permissions) : null, status, memberId, id]
    );

    return success(res, null, 'Co-organizer updated successfully.');
  } catch (err) {
    console.error('[Update Co-Organizer Error]:', err);
    return error(res, 'Failed to update co-organizer.', 500, err.message);
  }
}

async function removeCoOrganizer(req, res) {
  try {
    const { id, memberId } = req.params;

    await db.query(`DELETE FROM organizer_members WHERE id = $1 AND event_id = $2`, [memberId, id]);

    return success(res, null, 'Co-organizer removed successfully.');
  } catch (err) {
    console.error('[Remove Co-Organizer Error]:', err);
    return error(res, 'Failed to remove co-organizer.', 500, err.message);
  }
}

module.exports = {
  getMyEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  archiveEvent,
  regeneratePin,
  inviteCoOrganizer,
  getCoOrganizers,
  updateCoOrganizer,
  removeCoOrganizer
};
