const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { success, error } = require('../utils/response');

// GET /api/public/contests
async function getPublicContests(req, res) {
  try {
    const { search, language, status, page = 1, limit = 12 } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    let queryStr = `
      SELECT 
        e.id, 
        e.name, 
        e.description, 
        e.banner_url, 
        e.allowed_languages, 
        e.max_participants, 
        e.start_time, 
        e.end_time, 
        e.total_rounds, 
        e.status, 
        e.created_at,
        o.full_name as organizer_name,
        o.organization as organizer_organization,
        (SELECT COUNT(*) FROM participants WHERE event_id = e.id AND status = 'active')::int as registered_count
      FROM events e
      JOIN organizers o ON e.organizer_id = o.id
      WHERE e.visibility = 'public' AND e.is_deleted = FALSE
    `;

    if (search) {
      params.push(`%${search.trim()}%`);
      queryStr += ` AND (e.name ILIKE $${params.length} OR e.description ILIKE $${params.length} OR o.full_name ILIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      queryStr += ` AND e.status = $${params.length}`;
    }

    if (language) {
      params.push(language.toLowerCase());
      queryStr += ` AND $${params.length} = ANY(e.allowed_languages)`;
    }

    // Count total
    const countRes = await db.query(`SELECT COUNT(*) FROM (${queryStr}) as total_tbl`, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    queryStr += ` ORDER BY e.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(queryStr, params);

    return success(res, {
      contests: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[Public Contests Error]:', err);
    return error(res, 'Failed to fetch public contests.', 500, err.message);
  }
}

// GET /api/public/contests/:id
async function getPublicContestById(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        e.id, 
        e.name, 
        e.description, 
        e.banner_url, 
        e.allowed_languages, 
        e.max_participants, 
        e.start_time, 
        e.end_time, 
        e.total_rounds, 
        e.status, 
        e.rules,
        e.created_at,
        o.full_name as organizer_name,
        o.organization as organizer_organization,
        o.bio as organizer_bio,
        (SELECT COUNT(*) FROM participants WHERE event_id = e.id AND status = 'active')::int as registered_count
      FROM events e
      JOIN organizers o ON e.organizer_id = o.id
      WHERE e.id = $1 AND e.visibility = 'public' AND e.is_deleted = FALSE`,
      [id]
    );

    if (result.rows.length === 0) {
      return error(res, 'Public contest not found.', 404);
    }

    return success(res, { contest: result.rows[0] });
  } catch (err) {
    console.error('[Public Contest Details Error]:', err);
    return error(res, 'Failed to fetch contest details.', 500, err.message);
  }
}

// POST /api/contests/:id/join (Self-registration for public contest or with PIN for private)
async function joinContest(req, res) {
  try {
    const { id } = req.params;
    const { display_name, email, pin } = req.body;

    if (!display_name) {
      return error(res, 'Display name is required to join.', 400);
    }

    const eventRes = await db.query('SELECT * FROM events WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (eventRes.rows.length === 0) {
      return error(res, 'Contest not found.', 404);
    }

    const event = eventRes.rows[0];

    // If private, require PIN
    if (event.visibility === 'private') {
      if (!pin) {
        return error(res, 'This is a private contest. A valid PIN is required.', 403);
      }
      const isPinValid = await bcrypt.compare(pin.trim(), event.pin_hash);
      if (!isPinValid) {
        return error(res, 'Invalid contest PIN.', 403);
      }
    }

    // Check capacity
    const countRes = await db.query('SELECT COUNT(*) FROM participants WHERE event_id = $1', [id]);
    const currentCount = parseInt(countRes.rows[0].count, 10);
    if (currentCount >= event.max_participants) {
      return error(res, 'Contest participant capacity has been reached.', 400);
    }

    // Generate unique participant code and access code
    const pCode = `PART${String(currentCount + 1).padStart(3, '0')}`;
    const rawAccessCode = `SWAP-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const accessCodeHash = await bcrypt.hash(rawAccessCode, 10);
    const pId = uuidv4();

    await db.query(
      `INSERT INTO participants (id, event_id, participant_code, display_name, email, access_code_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [pId, id, pCode, display_name.trim(), email ? email.trim() : null, accessCodeHash]
    );

    return success(res, {
      participant_id: pId,
      participant_code: pCode,
      access_code: rawAccessCode,
      event_id: id,
      event_name: event.name
    }, 'Successfully registered for contest. Please save your participant ID and access code securely!', 201);
  } catch (err) {
    console.error('[Join Contest Error]:', err);
    return error(res, 'Failed to join contest.', 500, err.message);
  }
}

// POST /api/public/verify-pin (To check private PIN and get contest info)
async function verifyPin(req, res) {
  try {
    const { pin } = req.body;
    if (!pin) return error(res, 'PIN is required.', 400);

    const allEvents = await db.query(
      `SELECT e.id, e.name, e.description, e.banner_url, e.allowed_languages, e.status, e.pin_hash,
              o.full_name as organizer_name
       FROM events e
       JOIN organizers o ON e.organizer_id = o.id
       WHERE e.is_deleted = FALSE AND e.pin_hash IS NOT NULL`
    );

    let matched = null;
    for (const ev of allEvents.rows) {
      if (await bcrypt.compare(pin.trim(), ev.pin_hash)) {
        matched = ev;
        break;
      }
    }

    if (!matched) {
      return error(res, 'Invalid contest PIN.', 404);
    }

    const { pin_hash, ...safeContest } = matched;
    return success(res, { contest: safeContest }, 'PIN verified successfully.');
  } catch (err) {
    console.error('[Verify PIN Error]:', err);
    return error(res, 'PIN verification failed.', 500, err.message);
  }
}

module.exports = {
  getPublicContests,
  getPublicContestById,
  joinContest,
  verifyPin
};
