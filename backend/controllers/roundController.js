const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../utils/auditLogger');
const { emitToContest } = require('../socket/socketManager');

const VALID_TRANSITIONS = {
  preparation: ['bug_introduction'],
  bug_introduction: ['submission_locked', 'swap_configuration'],
  submission_locked: ['swap_configuration'],
  swap_configuration: ['debugging'],
  debugging: ['evaluation'],
  evaluation: ['results'],
  results: ['completed'],
  completed: []
};

// GET /api/events/:id/rounds
async function getRoundsByEvent(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM code_assignments WHERE round_id = r.id)::int as assignment_count,
        (SELECT COUNT(*) FROM modification_submissions WHERE round_id = r.id)::int as mod_submission_count,
        (SELECT COUNT(*) FROM swap_assignments WHERE round_id = r.id AND is_published = TRUE)::int as swap_count,
        (SELECT COUNT(*) FROM debug_submissions WHERE round_id = r.id)::int as debug_submission_count
       FROM rounds r
       WHERE r.event_id = $1
       ORDER BY r.round_number ASC`,
      [id]
    );

    return success(res, { rounds: result.rows });
  } catch (err) {
    console.error('[Get Rounds Error]:', err);
    return error(res, 'Failed to fetch rounds.', 500, err.message);
  }
}

// POST /api/events/:id/rounds (Create Round)
async function createRound(req, res) {
  try {
    const { id } = req.params;
    const { round_name, description, bug_intro_duration_minutes = 20, debug_duration_minutes = 30, scoring_config } = req.body;

    const countRes = await db.query(`SELECT COUNT(*) FROM rounds WHERE event_id = $1`, [id]);
    const nextNumber = parseInt(countRes.rows[0].count, 10) + 1;

    const roundId = uuidv4();
    await db.query(
      `INSERT INTO rounds (id, event_id, round_number, round_name, description, bug_intro_duration_minutes, debug_duration_minutes, scoring_config, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'preparation')`,
      [
        roundId,
        id,
        nextNumber,
        round_name || `Round ${nextNumber}`,
        description || null,
        parseInt(bug_intro_duration_minutes, 10) || 20,
        parseInt(debug_duration_minutes, 10) || 30,
        scoring_config ? JSON.stringify(scoring_config) : JSON.stringify({ test_cases: 60, organizer_review: 20, explanation: 20 })
      ]
    );

    return success(res, { id: roundId, round_number: nextNumber }, 'Round created successfully.', 201);
  } catch (err) {
    console.error('[Create Round Error]:', err);
    return error(res, 'Failed to create round.', 500, err.message);
  }
}

// GET /api/rounds/:id
async function getRoundById(req, res) {
  try {
    const { id } = req.params;
    const roundRes = await db.query(`SELECT * FROM rounds WHERE id = $1`, [id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);

    const round = roundRes.rows[0];

    // Calculate dynamic server-authoritative remaining time
    let serverRemainingSeconds = round.time_remaining_seconds;
    const now = new Date();

    if (round.status === 'bug_introduction' && round.bug_intro_start_time && !round.timer_paused_at) {
      const elapsed = Math.floor((now - new Date(round.bug_intro_start_time)) / 1000);
      const totalSeconds = (round.bug_intro_duration_minutes || 20) * 60;
      serverRemainingSeconds = Math.max(0, totalSeconds - elapsed);
    } else if (round.status === 'debugging' && round.debug_start_time && !round.timer_paused_at) {
      const elapsed = Math.floor((now - new Date(round.debug_start_time)) / 1000);
      const totalSeconds = (round.debug_duration_minutes || 30) * 60;
      serverRemainingSeconds = Math.max(0, totalSeconds - elapsed);
    }

    return success(res, {
      round: {
        ...round,
        server_remaining_seconds: serverRemainingSeconds,
        server_time: now.toISOString()
      }
    });
  } catch (err) {
    console.error('[Get Round Error]:', err);
    return error(res, 'Failed to fetch round.', 500, err.message);
  }
}

// POST /api/rounds/:id/start (Transitions to bug_introduction or debugging)
async function startRound(req, res) {
  try {
    const { id } = req.params;
    const roundRes = await db.query(`SELECT * FROM rounds WHERE id = $1`, [id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);

    const round = roundRes.rows[0];
    const now = new Date();
    let nextStatus = round.status;
    let durationSeconds = 0;

    if (round.status === 'preparation') {
      nextStatus = 'bug_introduction';
      durationSeconds = (round.bug_intro_duration_minutes || 20) * 60;
      await db.query(
        `UPDATE rounds 
         SET status = 'bug_introduction', bug_intro_start_time = $1, time_remaining_seconds = $2, timer_paused_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [now, durationSeconds, id]
      );
    } else if (round.status === 'swap_configuration') {
      // Swaps should be published through swapController.publishSwaps, but if invoked here:
      nextStatus = 'debugging';
      durationSeconds = (round.debug_duration_minutes || 30) * 60;
      await db.query(
        `UPDATE rounds 
         SET status = 'debugging', debug_start_time = $1, time_remaining_seconds = $2, timer_paused_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [now, durationSeconds, id]
      );
    } else {
      return error(res, `Cannot start round from current state '${round.status}'.`, 400);
    }

    // Set parent event status to 'live' if upcoming
    await db.query(`UPDATE events SET status = 'live', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'upcoming'`, [round.event_id]);

    emitToContest(round.event_id, 'round_status_change', {
      roundId: id,
      status: nextStatus,
      durationSeconds,
      startTime: now.toISOString()
    });

    await logAudit({
      eventId: round.event_id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'ROUND_STARTED',
      details: { roundId: id, status: nextStatus }
    });

    return success(res, { id, status: nextStatus, durationSeconds }, `Round transitioned to ${nextStatus}.`);
  } catch (err) {
    console.error('[Start Round Error]:', err);
    return error(res, 'Failed to start round.', 500, err.message);
  }
}

// POST /api/rounds/:id/pause
async function pauseRound(req, res) {
  try {
    const { id } = req.params;
    const now = new Date();

    const roundRes = await db.query(`SELECT * FROM rounds WHERE id = $1`, [id]);
    const round = roundRes.rows[0];

    await db.query(
      `UPDATE rounds SET timer_paused_at = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [now, id]
    );

    emitToContest(round.event_id, 'timer_paused', { roundId: id, pausedAt: now.toISOString() });

    return success(res, null, 'Round timer paused.');
  } catch (err) {
    console.error('[Pause Round Error]:', err);
    return error(res, 'Failed to pause round.', 500, err.message);
  }
}

// POST /api/rounds/:id/resume
async function resumeRound(req, res) {
  try {
    const { id } = req.params;
    const now = new Date();
    const roundRes = await db.query(`SELECT * FROM rounds WHERE id = $1`, [id]);
    const round = roundRes.rows[0];

    await db.query(
      `UPDATE rounds SET timer_paused_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    emitToContest(round.event_id, 'timer_resumed', { roundId: id, resumedAt: now.toISOString() });

    return success(res, null, 'Round timer resumed.');
  } catch (err) {
    console.error('[Resume Round Error]:', err);
    return error(res, 'Failed to resume round.', 500, err.message);
  }
}

// POST /api/rounds/:id/lock (Lock bug introduction submissions)
async function lockSubmissions(req, res) {
  try {
    const { id } = req.params;
    const roundRes = await db.query(`SELECT * FROM rounds WHERE id = $1`, [id]);
    const round = roundRes.rows[0];

    await db.query(
      `UPDATE rounds SET status = 'swap_configuration', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    emitToContest(round.event_id, 'submissions_locked', { roundId: id });

    return success(res, { status: 'swap_configuration' }, 'Bug submissions locked. Round is now in Swap Configuration.');
  } catch (err) {
    console.error('[Lock Submissions Error]:', err);
    return error(res, 'Failed to lock submissions.', 500, err.message);
  }
}

// POST /api/rounds/:id/end (Move to evaluation or completed)
async function endRound(req, res) {
  try {
    const { id } = req.params;
    const { next_status } = req.body;

    const roundRes = await db.query(`SELECT * FROM rounds WHERE id = $1`, [id]);
    const round = roundRes.rows[0];

    const targetStatus = next_status || (round.status === 'debugging' ? 'evaluation' : 'completed');

    await db.query(
      `UPDATE rounds SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [targetStatus, id]
    );

    emitToContest(round.event_id, 'round_status_change', { roundId: id, status: targetStatus });

    return success(res, { status: targetStatus }, `Round transitioned to ${targetStatus}.`);
  } catch (err) {
    console.error('[End Round Error]:', err);
    return error(res, 'Failed to end round.', 500, err.message);
  }
}

module.exports = {
  getRoundsByEvent,
  createRound,
  getRoundById,
  startRound,
  pauseRound,
  resumeRound,
  lockSubmissions,
  endRound
};
