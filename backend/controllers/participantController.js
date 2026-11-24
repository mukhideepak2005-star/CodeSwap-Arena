const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../utils/auditLogger');

// Generate access code
function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let str = '';
  for (let i = 0; i < 4; i++) str += chars.charAt(Math.floor(Math.random() * chars.length));
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SWAP-${str}-${num}`;
}

// GET /api/events/:id/participants
async function getParticipants(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        p.id, 
        p.event_id, 
        p.participant_code, 
        p.display_name, 
        p.email, 
        p.status, 
        p.is_registered, 
        p.joined_at, 
        p.created_at,
        (SELECT COUNT(*) FROM modification_submissions ms WHERE ms.participant_id = p.id)::int as bug_submissions_count,
        (SELECT COUNT(*) FROM debug_submissions ds WHERE ds.recipient_participant_id = p.id)::int as debug_submissions_count,
        (SELECT COALESCE(SUM(total_score), 0) FROM evaluations ev WHERE ev.participant_id = p.id)::numeric as total_score
       FROM participants p
       WHERE p.event_id = $1
       ORDER BY p.participant_code ASC`,
      [id]
    );

    return success(res, { participants: result.rows });
  } catch (err) {
    console.error('[Get Participants Error]:', err);
    return error(res, 'Failed to fetch participants.', 500, err.message);
  }
}

// POST /api/events/:id/participants (Add Individual Participant)
async function addParticipant(req, res) {
  try {
    const { id } = req.params;
    const { display_name, email } = req.body;

    if (!display_name) {
      return error(res, 'Participant display name is required.', 400);
    }

    const event = req.contest;

    // Check capacity
    const countRes = await db.query('SELECT COUNT(*) FROM participants WHERE event_id = $1', [id]);
    const currentCount = parseInt(countRes.rows[0].count, 10);
    if (currentCount >= event.max_participants) {
      return error(res, `Contest participant capacity of ${event.max_participants} reached.`, 400);
    }

    // Generate unique participant code
    const pCode = `PART${String(currentCount + 1).padStart(3, '0')}`;
    const plainAccessCode = generateAccessCode();
    const accessCodeHash = await bcrypt.hash(plainAccessCode, 10);
    const pId = uuidv4();

    await db.query(
      `INSERT INTO participants (id, event_id, participant_code, display_name, email, access_code_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [pId, id, pCode, display_name.trim(), email ? email.trim() : null, accessCodeHash]
    );

    await logAudit({
      eventId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'PARTICIPANT_ADDED',
      details: { participant_code: pCode, display_name }
    });

    return success(res, {
      id: pId,
      participant_code: pCode,
      display_name: display_name.trim(),
      email: email || null,
      access_code: plainAccessCode // Plaintext returned once for organizer credential distribution
    }, 'Participant created successfully.', 201);
  } catch (err) {
    console.error('[Add Participant Error]:', err);
    return error(res, 'Failed to add participant.', 500, err.message);
  }
}

// POST /api/events/:id/participants/import (CSV / Bulk Import)
async function importParticipants(req, res) {
  try {
    const { id } = req.params;
    const { participants: rawList } = req.body;

    if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
      return error(res, 'A list of participants is required for import.', 400);
    }

    const event = req.contest;
    const countRes = await db.query('SELECT COUNT(*) FROM participants WHERE event_id = $1', [id]);
    let currentCount = parseInt(countRes.rows[0].count, 10);

    if (currentCount + rawList.length > event.max_participants) {
      return error(
        res,
        `Importing ${rawList.length} participants exceeds remaining capacity (${event.max_participants - currentCount} spots available).`,
        400
      );
    }

    const createdList = [];

    for (const item of rawList) {
      const name = item.display_name || item.name;
      if (!name) continue;

      currentCount++;
      const pCode = `PART${String(currentCount).padStart(3, '0')}`;
      const plainAccessCode = generateAccessCode();
      const accessCodeHash = await bcrypt.hash(plainAccessCode, 10);
      const pId = uuidv4();

      await db.query(
        `INSERT INTO participants (id, event_id, participant_code, display_name, email, access_code_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [pId, id, pCode, name.trim(), item.email ? item.email.trim() : null, accessCodeHash]
      );

      createdList.push({
        id: pId,
        participant_code: pCode,
        display_name: name.trim(),
        email: item.email || null,
        access_code: plainAccessCode
      });
    }

    await logAudit({
      eventId: id,
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'PARTICIPANTS_IMPORTED',
      details: { count: createdList.length }
    });

    return success(res, {
      imported_count: createdList.length,
      credentials: createdList // One-time credential export array
    }, `Successfully imported ${createdList.length} participants.`, 201);
  } catch (err) {
    console.error('[Import Participants Error]:', err);
    return error(res, 'Failed to import participants.', 500, err.message);
  }
}

// PATCH /api/participants/:id (Status: active, inactive, disqualified)
async function updateParticipant(req, res) {
  try {
    const { id } = req.params;
    const { status, display_name, email } = req.body;

    await db.query(
      `UPDATE participants SET
        status = COALESCE($1, status),
        display_name = COALESCE($2, display_name),
        email = COALESCE($3, email)
       WHERE id = $4`,
      [status, display_name, email, id]
    );

    return success(res, null, 'Participant updated successfully.');
  } catch (err) {
    console.error('[Update Participant Error]:', err);
    return error(res, 'Failed to update participant.', 500, err.message);
  }
}

// DELETE /api/participants/:id
async function deleteParticipant(req, res) {
  try {
    const { id } = req.params;

    // Check if participant has existing submissions
    const subCheck = await db.query(
      `SELECT COUNT(*) FROM modification_submissions WHERE participant_id = $1`,
      [id]
    );
    if (parseInt(subCheck.rows[0].count, 10) > 0) {
      return error(res, 'Cannot delete participant who has already made submissions in a round. Set status to inactive or disqualified instead.', 400);
    }

    await db.query(`DELETE FROM participants WHERE id = $1`, [id]);
    return success(res, null, 'Participant removed successfully.');
  } catch (err) {
    console.error('[Delete Participant Error]:', err);
    return error(res, 'Failed to delete participant.', 500, err.message);
  }
}

module.exports = {
  getParticipants,
  addParticipant,
  importParticipants,
  updateParticipant,
  deleteParticipant
};
