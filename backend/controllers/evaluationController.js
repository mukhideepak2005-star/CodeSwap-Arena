const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../utils/auditLogger');
const { emitToContest } = require('../socket/socketManager');

// GET /api/events/:id/evaluations (List evaluations for contest / round)
async function getEvaluationsByEvent(req, res) {
  try {
    const { id } = req.params;
    const { round_id } = req.query;

    let queryStr = `
      SELECT 
        ev.*,
        p.participant_code,
        p.display_name as participant_name,
        r.round_number,
        r.round_name,
        ds.bug_explanation,
        ds.submission_time as debug_submission_time,
        cb.title as challenge_title,
        cb.language
      FROM evaluations ev
      JOIN participants p ON ev.participant_id = p.id
      JOIN rounds r ON ev.round_id = r.id
      JOIN debug_submissions ds ON ev.debug_submission_id = ds.id
      JOIN swap_assignments sa ON ds.swap_assignment_id = sa.id
      JOIN modification_submissions ms ON sa.modification_submission_id = ms.id
      JOIN code_blocks cb ON ms.code_block_id = cb.id
      WHERE ev.event_id = $1
    `;
    const params = [id];

    if (round_id) {
      params.push(round_id);
      queryStr += ` AND ev.round_id = $2`;
    }

    queryStr += ` ORDER BY ev.total_score DESC, ev.test_cases_passed DESC, ds.submission_time ASC`;

    const result = await db.query(queryStr, params);
    return success(res, { evaluations: result.rows });
  } catch (err) {
    console.error('[Get Evaluations Error]:', err);
    return error(res, 'Failed to fetch evaluations.', 500, err.message);
  }
}

// GET /api/evaluations/:id (Detailed view: buggy vs corrected code, test details)
async function getEvaluationDetails(req, res) {
  try {
    const { id } = req.params;

    const evalRes = await db.query(
      `SELECT 
        ev.*,
        p.participant_code,
        p.display_name as participant_name,
        r.round_number,
        r.round_name,
        r.scoring_config,
        ds.corrected_code,
        ds.bug_explanation,
        ds.submission_time as debug_submission_time,
        ms.modified_code as received_buggy_code,
        cb.title as challenge_title,
        cb.description as challenge_description,
        cb.language,
        cb.original_code
       FROM evaluations ev
       JOIN participants p ON ev.participant_id = p.id
       JOIN rounds r ON ev.round_id = r.id
       JOIN debug_submissions ds ON ev.debug_submission_id = ds.id
       JOIN swap_assignments sa ON ds.swap_assignment_id = sa.id
       JOIN modification_submissions ms ON sa.modification_submission_id = ms.id
       JOIN code_blocks cb ON ms.code_block_id = cb.id
       WHERE ev.id = $1`,
      [id]
    );

    if (evalRes.rows.length === 0) return error(res, 'Evaluation not found.', 404);
    const evaluation = evalRes.rows[0];

    // Fetch individual test case results
    const detailsRes = await db.query(
      `SELECT ed.*, tc.input_data, tc.expected_output, tc.is_hidden, tc.marks as max_test_marks
       FROM evaluation_details ed
       JOIN test_cases tc ON ed.test_case_id = tc.id
       WHERE ed.evaluation_id = $1
       ORDER BY tc.is_hidden ASC, tc.created_at ASC`,
      [id]
    );

    return success(res, {
      evaluation,
      testCaseResults: detailsRes.rows
    });
  } catch (err) {
    console.error('[Get Evaluation Details Error]:', err);
    return error(res, 'Failed to fetch evaluation details.', 500, err.message);
  }
}

// POST /api/evaluations/:id/review (Organizer review and score adjustment)
async function reviewEvaluation(req, res) {
  try {
    const { id } = req.params;
    const {
      organizer_score,
      explanation_score,
      organizer_comments,
      score_adjustment_reason,
      status = 'completed'
    } = req.body;

    // Fetch current evaluation
    const currentRes = await db.query(`SELECT * FROM evaluations WHERE id = $1`, [id]);
    if (currentRes.rows.length === 0) return error(res, 'Evaluation not found.', 404);
    const current = currentRes.rows[0];

    const newOrgScore = organizer_score !== undefined ? parseFloat(organizer_score) : parseFloat(current.organizer_score || 0);
    const newExpScore = explanation_score !== undefined ? parseFloat(explanation_score) : parseFloat(current.explanation_score || 0);
    const autoScore = parseFloat(current.automated_score || 0);

    const newTotal = Math.round((autoScore + newOrgScore + newExpScore) * 100) / 100;

    await db.query(
      `UPDATE evaluations SET
        organizer_score = $1,
        explanation_score = $2,
        total_score = $3,
        organizer_comments = $4,
        score_adjustment_reason = $5,
        status = $6,
        reviewed_by = $7,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        newOrgScore,
        newExpScore,
        newTotal,
        organizer_comments || current.organizer_comments,
        score_adjustment_reason || null,
        status,
        req.user.id,
        id
      ]
    );

    await logAudit({
      eventId: current.event_id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'EVALUATION_REVIEWED',
      details: {
        evaluationId: id,
        previousTotal: current.total_score,
        newTotal,
        reason: score_adjustment_reason || 'Standard organizer evaluation'
      }
    });

    emitToContest(current.event_id, 'evaluation_updated', { evaluationId: id });

    return success(res, { id, total_score: newTotal }, 'Evaluation reviewed and scores updated successfully.');
  } catch (err) {
    console.error('[Review Evaluation Error]:', err);
    return error(res, 'Failed to update evaluation review.', 500, err.message);
  }
}

module.exports = {
  getEvaluationsByEvent,
  getEvaluationDetails,
  reviewEvaluation
};
