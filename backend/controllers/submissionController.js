const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { success, error } = require('../utils/response');
const { runAutomatedEvaluation } = require('../services/evaluationService');
const { emitToContest, emitToUser } = require('../socket/socketManager');
const { logAudit } = require('../utils/auditLogger');

// GET /api/student/my-task (Fetches active assignment or anonymous swapped code)
async function getMyTask(req, res) {
  try {
    const participantId = req.user.id;
    const eventId = req.user.eventId;

    // 1. Get active round for this contest
    const roundRes = await db.query(
      `SELECT * FROM rounds 
       WHERE event_id = $1 AND status != 'completed' 
       ORDER BY round_number ASC LIMIT 1`,
      [eventId]
    );

    if (roundRes.rows.length === 0) {
      return success(res, { phase: 'idle', message: 'No active round in progress.' });
    }

    const round = roundRes.rows[0];

    // Compute server remaining seconds
    let serverRemainingSeconds = round.time_remaining_seconds || 0;
    const now = new Date();
    if (round.status === 'bug_introduction' && round.bug_intro_start_time && !round.timer_paused_at) {
      const elapsed = Math.floor((now - new Date(round.bug_intro_start_time)) / 1000);
      serverRemainingSeconds = Math.max(0, (round.bug_intro_duration_minutes || 20) * 60 - elapsed);
    } else if (round.status === 'debugging' && round.debug_start_time && !round.timer_paused_at) {
      const elapsed = Math.floor((now - new Date(round.debug_start_time)) / 1000);
      serverRemainingSeconds = Math.max(0, (round.debug_duration_minutes || 30) * 60 - elapsed);
    }

    // Phase A: Preparation or Bug Introduction
    if (round.status === 'preparation' || round.status === 'bug_introduction') {
      const assignRes = await db.query(
        `SELECT ca.*, cb.title, cb.description, cb.language, cb.difficulty, cb.original_code, cb.input_format, cb.expected_output, cb.time_limit_ms
         FROM code_assignments ca
         JOIN code_blocks cb ON ca.code_block_id = cb.id
         WHERE ca.round_id = $1 AND ca.participant_id = $2`,
        [round.id, participantId]
      );

      if (assignRes.rows.length === 0) {
        return success(res, {
          phase: 'unassigned',
          round,
          message: 'Organizer has not assigned a code challenge to you yet.'
        });
      }

      const assignment = assignRes.rows[0];

      // Fetch public test cases ONLY
      const testRes = await db.query(
        `SELECT id, input_data, expected_output, marks FROM test_cases WHERE code_block_id = $1 AND is_hidden = FALSE`,
        [assignment.code_block_id]
      );

      // Check if participant already submitted modified code
      const subRes = await db.query(
        `SELECT * FROM modification_submissions WHERE round_id = $1 AND participant_id = $2`,
        [round.id, participantId]
      );

      return success(res, {
        phase: 'bug_introduction',
        round: {
          ...round,
          server_remaining_seconds: serverRemainingSeconds
        },
        task: {
          assignment_id: assignment.id,
          code_block_id: assignment.code_block_id,
          title: assignment.title,
          description: assignment.description,
          language: assignment.language,
          difficulty: assignment.difficulty,
          original_code: assignment.original_code,
          input_format: assignment.input_format,
          expected_output: assignment.expected_output,
          public_test_cases: testRes.rows
        },
        existingSubmission: subRes.rows[0] || null
      });
    }

    // Phase B: Submission Locked or Swap Configuration
    if (round.status === 'submission_locked' || round.status === 'swap_configuration') {
      return success(res, {
        phase: 'waiting_for_swaps',
        round,
        message: 'Bug introduction closed. Organizer is currently preparing and publishing anonymous code swaps.'
      });
    }

    // Phase C: Debugging (Anonymous Swapped Code)
    if (round.status === 'debugging') {
      const swapRes = await db.query(
        `SELECT 
          sa.id as swap_assignment_id,
          sa.round_id,
          sa.event_id,
          ms.modified_code,
          ms.code_block_id,
          cb.title,
          cb.description,
          cb.language,
          cb.input_format,
          cb.expected_output,
          cb.time_limit_ms
         FROM swap_assignments sa
         JOIN modification_submissions ms ON sa.modification_submission_id = ms.id
         JOIN code_blocks cb ON ms.code_block_id = cb.id
         WHERE sa.round_id = $1 AND sa.recipient_participant_id = $2 AND sa.is_published = TRUE`,
        [round.id, participantId]
      );

      if (swapRes.rows.length === 0) {
        return success(res, {
          phase: 'unassigned_swap',
          round,
          message: 'No code swap assigned to you in this round.'
        });
      }

      const swapData = swapRes.rows[0];

      // Fetch public test cases ONLY
      const testRes = await db.query(
        `SELECT id, input_data, expected_output, marks FROM test_cases WHERE code_block_id = $1 AND is_hidden = FALSE`,
        [swapData.code_block_id]
      );

      // Check if debugging solution already submitted
      const debugSubRes = await db.query(
        `SELECT * FROM debug_submissions WHERE round_id = $1 AND recipient_participant_id = $2`,
        [round.id, participantId]
      );

      return success(res, {
        phase: 'debugging',
        round: {
          ...round,
          server_remaining_seconds: serverRemainingSeconds
        },
        task: {
          swap_assignment_id: swapData.swap_assignment_id,
          code_block_id: swapData.code_block_id,
          anonymous_challenge_id: `CHAL-${swapData.code_block_id.slice(0, 8).toUpperCase()}`,
          title: swapData.title,
          description: swapData.description,
          language: swapData.language,
          received_buggy_code: swapData.modified_code, // SENDER IDENTITY FULLY ANONYMIZED
          input_format: swapData.input_format,
          expected_output: swapData.expected_output,
          public_test_cases: testRes.rows
        },
        existingSubmission: debugSubRes.rows[0] || null
      });
    }

    // Phase D: Evaluation, Results, Completed
    return success(res, {
      phase: round.status,
      round,
      message: `Round is currently in ${round.status} phase.`
    });
  } catch (err) {
    console.error('[Get My Task Error]:', err);
    return error(res, 'Failed to fetch student task.', 500, err.message);
  }
}

// POST /api/submissions/modify (Submit Modified Buggy Code)
async function submitModifiedCode(req, res) {
  try {
    const participantId = req.user.id;
    const eventId = req.user.eventId;
    const { round_id, code_block_id, modified_code } = req.body;

    if (!round_id || !code_block_id || !modified_code) {
      return error(res, 'Round ID, Code Block ID, and Modified Code are required.', 400);
    }

    // Check round state
    const roundRes = await db.query(`SELECT * FROM rounds WHERE id = $1`, [round_id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);
    const round = roundRes.rows[0];

    if (round.status !== 'bug_introduction') {
      return error(res, `Bug submissions are not accepted. Round status is '${round.status}'.`, 400);
    }

    // Check timer deadline
    if (round.bug_intro_start_time) {
      const now = new Date();
      const elapsed = Math.floor((now - new Date(round.bug_intro_start_time)) / 1000);
      const totalSeconds = (round.bug_intro_duration_minutes || 20) * 60;
      if (elapsed > totalSeconds + 10) { // 10s grace period for latency
        return error(res, 'Submission deadline has passed for the Bug Introduction stage.', 403);
      }
    }

    const subId = uuidv4();
    await db.query(
      `INSERT INTO modification_submissions (id, round_id, event_id, participant_id, code_block_id, modified_code, submission_time)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (round_id, participant_id)
       DO UPDATE SET modified_code = EXCLUDED.modified_code, submission_time = CURRENT_TIMESTAMP`,
      [subId, round_id, eventId, participantId, code_block_id, modified_code]
    );

    emitToContest(eventId, 'participant_submitted', {
      roundId: round_id,
      participantId,
      stage: 'bug_introduction'
    });

    return success(res, { submission_id: subId }, 'Buggy code modification submitted successfully!');
  } catch (err) {
    console.error('[Submit Modified Code Error]:', err);
    return error(res, 'Failed to submit modified code.', 500, err.message);
  }
}

// POST /api/submissions/debug (Submit Debugging Solution)
async function submitDebuggingSolution(req, res) {
  try {
    const participantId = req.user.id;
    const eventId = req.user.eventId;
    const { swap_assignment_id, round_id, code_block_id, corrected_code, bug_explanation, language } = req.body;

    if (!swap_assignment_id || !round_id || !corrected_code) {
      return error(res, 'Swap Assignment ID, Round ID, and Corrected Code are required.', 400);
    }

    // Check round state
    const roundRes = await db.query(`SELECT * FROM rounds WHERE id = $1`, [round_id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);
    const round = roundRes.rows[0];

    if (round.status !== 'debugging') {
      return error(res, `Debugging submissions are closed. Round status is '${round.status}'.`, 400);
    }

    // Check timer deadline
    if (round.debug_start_time) {
      const now = new Date();
      const elapsed = Math.floor((now - new Date(round.debug_start_time)) / 1000);
      const totalSeconds = (round.debug_duration_minutes || 30) * 60;
      if (elapsed > totalSeconds + 15) { // 15s grace period
        return error(res, 'Submission deadline has passed for the Debugging stage.', 403);
      }
    }

    const debugSubId = uuidv4();
    await db.query(
      `INSERT INTO debug_submissions (id, swap_assignment_id, round_id, event_id, recipient_participant_id, corrected_code, bug_explanation, submission_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (round_id, recipient_participant_id)
       DO UPDATE SET 
         corrected_code = EXCLUDED.corrected_code,
         bug_explanation = EXCLUDED.bug_explanation,
         submission_time = CURRENT_TIMESTAMP`,
      [debugSubId, swap_assignment_id, round_id, eventId, participantId, corrected_code, bug_explanation || null]
    );

    // Run automated evaluation against hidden test cases in the background
    let evalSummary = null;
    try {
      evalSummary = await runAutomatedEvaluation({
        debugSubmissionId: debugSubId,
        roundId: round_id,
        eventId,
        recipientParticipantId: participantId,
        correctedCode: corrected_code,
        codeBlockId: code_block_id,
        language: language || 'python'
      });
    } catch (evalErr) {
      console.error('[Automated Evaluation Background Error]:', evalErr.message);
    }

    emitToContest(eventId, 'participant_submitted', {
      roundId: round_id,
      participantId,
      stage: 'debugging'
    });

    return success(res, {
      submission_id: debugSubId,
      evaluation: evalSummary
    }, 'Debugging solution submitted and evaluated successfully!');
  } catch (err) {
    console.error('[Submit Debugging Solution Error]:', err);
    return error(res, 'Failed to submit debugging solution.', 500, err.message);
  }
}

// GET /api/student/my-results
async function getMyResults(req, res) {
  try {
    const participantId = req.user.id;
    const eventId = req.user.eventId;

    const result = await db.query(
      `SELECT 
        ev.*,
        r.round_number,
        r.round_name,
        ds.bug_explanation,
        ds.submission_time
       FROM evaluations ev
       JOIN rounds r ON ev.round_id = r.id
       LEFT JOIN debug_submissions ds ON ev.debug_submission_id = ds.id
       WHERE ev.participant_id = $1 AND ev.event_id = $2
       ORDER BY r.round_number ASC`,
      [participantId, eventId]
    );

    return success(res, { results: result.rows });
  } catch (err) {
    console.error('[Get My Results Error]:', err);
    return error(res, 'Failed to fetch participant results.', 500, err.message);
  }
}

module.exports = {
  getMyTask,
  submitModifiedCode,
  submitDebuggingSolution,
  getMyResults
};
