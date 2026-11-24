const db = require('../database/db');
const { success, error } = require('../utils/response');

// GET /api/rounds/:id/leaderboard (Round Leaderboard)
async function getRoundLeaderboard(req, res) {
  try {
    const { id } = req.params;

    const roundRes = await db.query(`SELECT id, event_id, round_number, round_name, status FROM rounds WHERE id = $1`, [id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);
    const round = roundRes.rows[0];

    // Fetch scores with tie-breaker sorting:
    // 1. Higher total score
    // 2. Higher automatic score
    // 3. More test cases passed
    // 4. Earlier submission time
    const result = await db.query(
      `SELECT 
        p.id as participant_id,
        p.participant_code,
        p.display_name,
        ev.automated_score,
        ev.organizer_score,
        ev.explanation_score,
        ev.total_score,
        ev.test_cases_passed,
        ev.total_test_cases,
        ev.status as evaluation_status,
        ds.submission_time
       FROM participants p
       JOIN evaluations ev ON ev.participant_id = p.id AND ev.round_id = $1
       JOIN debug_submissions ds ON ev.debug_submission_id = ds.id
       WHERE p.event_id = $2 AND p.status = 'active'
       ORDER BY 
         ev.total_score DESC, 
         ev.automated_score DESC, 
         ev.test_cases_passed DESC, 
         ds.submission_time ASC`,
      [id, round.event_id]
    );

    // Assign rank
    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      ...row
    }));

    return success(res, {
      round,
      leaderboard
    });
  } catch (err) {
    console.error('[Round Leaderboard Error]:', err);
    return error(res, 'Failed to fetch round leaderboard.', 500, err.message);
  }
}

// GET /api/events/:id/leaderboard (Overall Contest Leaderboard across all rounds)
async function getEventLeaderboard(req, res) {
  try {
    const { id } = req.params;

    const eventRes = await db.query(`SELECT id, name, status FROM events WHERE id = $1`, [id]);
    if (eventRes.rows.length === 0) return error(res, 'Contest not found.', 404);
    const contest = eventRes.rows[0];

    // Aggregate overall scores across all completed rounds
    const result = await db.query(
      `SELECT 
        p.id as participant_id,
        p.participant_code,
        p.display_name,
        COALESCE(SUM(ev.automated_score), 0)::numeric as total_auto_score,
        COALESCE(SUM(ev.organizer_score + ev.explanation_score), 0)::numeric as total_manual_score,
        COALESCE(SUM(ev.total_score), 0)::numeric as total_score,
        COALESCE(SUM(ev.test_cases_passed), 0)::int as total_tests_passed,
        COUNT(ev.id)::int as completed_rounds_count
       FROM participants p
       LEFT JOIN evaluations ev ON ev.participant_id = p.id AND ev.event_id = $1
       WHERE p.event_id = $1 AND p.status = 'active'
       GROUP BY p.id, p.participant_code, p.display_name
       ORDER BY 
         total_score DESC, 
         total_auto_score DESC, 
         total_tests_passed DESC`,
      [id]
    );

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      ...row
    }));

    return success(res, {
      contest,
      leaderboard
    });
  } catch (err) {
    console.error('[Contest Leaderboard Error]:', err);
    return error(res, 'Failed to fetch contest leaderboard.', 500, err.message);
  }
}

module.exports = {
  getRoundLeaderboard,
  getEventLeaderboard
};
