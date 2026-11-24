const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../utils/auditLogger');

// GET /api/rounds/:id/assignments
async function getAssignments(req, res) {
  try {
    const { id } = req.params;

    const roundRes = await db.query(`SELECT event_id, status FROM rounds WHERE id = $1`, [id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);
    const round = roundRes.rows[0];

    // Fetch all active participants in contest + their current round assignment
    const result = await db.query(
      `SELECT 
        p.id as participant_id,
        p.participant_code,
        p.display_name,
        p.status as participant_status,
        ca.id as assignment_id,
        ca.code_block_id,
        ca.assigned_at,
        ca.is_locked,
        cb.title as challenge_title,
        cb.language as challenge_language,
        cb.difficulty as challenge_difficulty
       FROM participants p
       LEFT JOIN code_assignments ca ON ca.participant_id = p.id AND ca.round_id = $1
       LEFT JOIN code_blocks cb ON ca.code_block_id = cb.id
       WHERE p.event_id = $2 AND p.status = 'active'
       ORDER BY p.participant_code ASC`,
      [id, round.event_id]
    );

    // Also get all available code blocks for the dropdown
    const blocksRes = await db.query(
      `SELECT id, title, language, difficulty FROM code_blocks WHERE event_id = $1 ORDER BY title ASC`,
      [round.event_id]
    );

    return success(res, {
      assignments: result.rows,
      availableChallenges: blocksRes.rows,
      roundStatus: round.status
    });
  } catch (err) {
    console.error('[Get Assignments Error]:', err);
    return error(res, 'Failed to fetch assignments.', 500, err.message);
  }
}

// POST /api/rounds/:id/assignments (Assign single challenge to participant)
async function assignChallenge(req, res) {
  try {
    const { id } = req.params;
    const { participant_id, code_block_id } = req.body;

    if (!participant_id || !code_block_id) {
      return error(res, 'Participant ID and Code Block ID are required.', 400);
    }

    const roundRes = await db.query(`SELECT status, event_id FROM rounds WHERE id = $1`, [id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);

    const assignId = uuidv4();
    await db.query(
      `INSERT INTO code_assignments (id, round_id, participant_id, code_block_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (round_id, participant_id)
       DO UPDATE SET code_block_id = EXCLUDED.code_block_id, assigned_at = CURRENT_TIMESTAMP`,
      [assignId, id, participant_id, code_block_id]
    );

    return success(res, { assignment_id: assignId }, 'Challenge assigned successfully.');
  } catch (err) {
    console.error('[Assign Challenge Error]:', err);
    return error(res, 'Failed to assign challenge.', 500, err.message);
  }
}

// POST /api/rounds/:id/assignments/bulk (Batch assign or Auto-distribute)
async function bulkAssign(req, res) {
  try {
    const { id } = req.params;
    const { assignments } = req.body; // Array of { participant_id, code_block_id }

    if (!Array.isArray(assignments)) {
      return error(res, 'Assignments array required.', 400);
    }

    for (const a of assignments) {
      if (!a.participant_id || !a.code_block_id) continue;
      await db.query(
        `INSERT INTO code_assignments (id, round_id, participant_id, code_block_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (round_id, participant_id)
         DO UPDATE SET code_block_id = EXCLUDED.code_block_id, assigned_at = CURRENT_TIMESTAMP`,
        [uuidv4(), id, a.participant_id, a.code_block_id]
      );
    }

    return success(res, { count: assignments.length }, 'Assignments updated successfully.');
  } catch (err) {
    console.error('[Bulk Assign Error]:', err);
    return error(res, 'Failed to perform bulk assignment.', 500, err.message);
  }
}

// POST /api/rounds/:id/assignments/auto-distribute
async function autoDistribute(req, res) {
  try {
    const { id } = req.params;
    const roundRes = await db.query(`SELECT event_id FROM rounds WHERE id = $1`, [id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);
    const eventId = roundRes.rows[0].event_id;

    // Fetch active participants
    const partsRes = await db.query(`SELECT id FROM participants WHERE event_id = $1 AND status = 'active'`, [eventId]);
    const participants = partsRes.rows;

    // Fetch available challenges
    const blocksRes = await db.query(`SELECT id FROM code_blocks WHERE event_id = $1`, [eventId]);
    const blocks = blocksRes.rows;

    if (blocks.length === 0) {
      return error(res, 'No code challenges available in contest code library to assign.', 400);
    }

    let assignedCount = 0;
    for (let i = 0; i < participants.length; i++) {
      const block = blocks[i % blocks.length];
      await db.query(
        `INSERT INTO code_assignments (id, round_id, participant_id, code_block_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (round_id, participant_id)
         DO UPDATE SET code_block_id = EXCLUDED.code_block_id, assigned_at = CURRENT_TIMESTAMP`,
        [uuidv4(), id, participants[i].id, block.id]
      );
      assignedCount++;
    }

    return success(res, { assignedCount }, `Evenly distributed ${blocks.length} challenges among ${participants.length} participants.`);
  } catch (err) {
    console.error('[Auto Distribute Error]:', err);
    return error(res, 'Failed to auto-distribute challenges.', 500, err.message);
  }
}

// POST /api/rounds/:id/assignments/lock
async function lockAssignments(req, res) {
  try {
    const { id } = req.params;
    await db.query(`UPDATE code_assignments SET is_locked = TRUE WHERE round_id = $1`, [id]);
    return success(res, null, 'Assignments locked for this round.');
  } catch (err) {
    console.error('[Lock Assignments Error]:', err);
    return error(res, 'Failed to lock assignments.', 500, err.message);
  }
}

module.exports = {
  getAssignments,
  assignChallenge,
  bulkAssign,
  autoDistribute,
  lockAssignments
};
