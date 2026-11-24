const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { success, error } = require('../utils/response');
const { validateSwapMappings, generateDerangementDraft, publishSwaps } = require('../services/swapEngine');
const { emitToContest } = require('../socket/socketManager');

// GET /api/rounds/:id/swaps (Organizer Swap Manager View)
async function getRoundSwaps(req, res) {
  try {
    const { id } = req.params;

    const roundRes = await db.query(`SELECT event_id, status FROM rounds WHERE id = $1`, [id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);
    const round = roundRes.rows[0];

    // 1. Fetch all bug submissions for this round with sender details
    const subsRes = await db.query(
      `SELECT 
        ms.id as modification_submission_id,
        ms.participant_id as sender_participant_id,
        p.participant_code as sender_participant_code,
        p.display_name as sender_display_name,
        cb.id as code_block_id,
        cb.title as challenge_title,
        cb.language,
        cb.difficulty,
        ms.submission_time,
        sa.id as swap_assignment_id,
        sa.recipient_participant_id,
        sa.is_published,
        rp.participant_code as recipient_participant_code,
        rp.display_name as recipient_display_name
       FROM modification_submissions ms
       JOIN participants p ON ms.participant_id = p.id
       JOIN code_blocks cb ON ms.code_block_id = cb.id
       LEFT JOIN swap_assignments sa ON sa.modification_submission_id = ms.id
       LEFT JOIN participants rp ON sa.recipient_participant_id = rp.id
       WHERE ms.round_id = $1
       ORDER BY p.participant_code ASC`,
      [id]
    );

    // 2. Fetch all eligible active participants for the recipient dropdown
    const partsRes = await db.query(
      `SELECT id as participant_id, participant_code, display_name 
       FROM participants 
       WHERE event_id = $1 AND status = 'active'
       ORDER BY participant_code ASC`,
      [round.event_id]
    );

    return success(res, {
      roundStatus: round.status,
      submissions: subsRes.rows,
      eligibleRecipients: partsRes.rows,
      isPublished: subsRes.rows.some(r => r.is_published)
    });
  } catch (err) {
    console.error('[Get Swaps Error]:', err);
    return error(res, 'Failed to fetch swap configurations.', 500, err.message);
  }
}

// POST /api/rounds/:id/swaps/draft (Save draft or auto-derangement proposal)
async function generateDraftMappings(req, res) {
  try {
    const { id } = req.params;

    const roundRes = await db.query(`SELECT event_id FROM rounds WHERE id = $1`, [id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);

    const subsRes = await db.query(
      `SELECT 
        ms.id as modification_submission_id,
        ms.round_id,
        ms.event_id,
        p.id as participant_id,
        p.participant_code,
        p.display_name,
        cb.title as challenge_title,
        cb.language
       FROM modification_submissions ms
       JOIN participants p ON ms.participant_id = p.id
       JOIN code_blocks cb ON ms.code_block_id = cb.id
       WHERE ms.round_id = $1`,
      [id]
    );

    if (subsRes.rows.length < 2) {
      return error(res, 'At least 2 participant submissions are required to perform a swap.', 400);
    }

    const draftMappings = generateDerangementDraft(subsRes.rows);

    return success(res, { draftMappings }, 'Auto-generated non-self swap draft generated successfully.');
  } catch (err) {
    console.error('[Draft Mappings Error]:', err);
    return error(res, 'Failed to generate draft mappings.', 500, err.message);
  }
}

// POST /api/rounds/:id/swaps/validate
async function validateMappings(req, res) {
  try {
    const { id } = req.params;
    const { mappings } = req.body;

    const roundRes = await db.query(`SELECT event_id FROM rounds WHERE id = $1`, [id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);
    const eventId = roundRes.rows[0].event_id;

    const partsRes = await db.query(`SELECT id FROM participants WHERE event_id = $1 AND status = 'active'`, [eventId]);
    const eligibleIds = partsRes.rows.map(r => r.id);

    const subsRes = await db.query(`SELECT participant_id FROM modification_submissions WHERE round_id = $1`, [id]);
    const submittedIds = subsRes.rows.map(r => r.participant_id);

    const validation = validateSwapMappings(mappings, eligibleIds, submittedIds);

    return success(res, validation);
  } catch (err) {
    console.error('[Validate Swaps Error]:', err);
    return error(res, 'Failed to validate swap mappings.', 500, err.message);
  }
}

// POST /api/rounds/:id/swaps/publish (Atomic DB transaction publishing)
async function publishRoundSwaps(req, res) {
  try {
    const { id } = req.params;
    const { mappings } = req.body;

    const roundRes = await db.query(`SELECT event_id, status FROM rounds WHERE id = $1`, [id]);
    if (roundRes.rows.length === 0) return error(res, 'Round not found.', 404);
    const round = roundRes.rows[0];

    // Validate before publish
    const partsRes = await db.query(`SELECT id FROM participants WHERE event_id = $1 AND status = 'active'`, [round.event_id]);
    const eligibleIds = partsRes.rows.map(r => r.id);

    const subsRes = await db.query(`SELECT participant_id FROM modification_submissions WHERE round_id = $1`, [id]);
    const submittedIds = subsRes.rows.map(r => r.participant_id);

    const validation = validateSwapMappings(mappings, eligibleIds, submittedIds);
    if (!validation.isValid) {
      return error(res, 'Swap validation failed: ' + validation.errors.join('; '), 400, validation.errors);
    }

    // Publish atomically
    const publishResult = await publishSwaps({
      roundId: id,
      eventId: round.event_id,
      mappings,
      organizerId: req.user.id
    });

    // Notify all participants in this contest that swaps have been published and debugging has started!
    emitToContest(round.event_id, 'swaps_published', {
      roundId: id,
      status: 'debugging',
      publishedAt: publishResult.publishedAt
    });

    return success(res, publishResult, `Swaps successfully published for ${publishResult.count} participants. Debugging phase is now active!`);
  } catch (err) {
    console.error('[Publish Swaps Error]:', err);
    return error(res, 'Failed to publish swap assignments.', 500, err.message);
  }
}

module.exports = {
  getRoundSwaps,
  generateDraftMappings,
  validateMappings,
  publishRoundSwaps
};
