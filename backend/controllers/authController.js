const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const config = require('../config/config');
const { success, error } = require('../utils/response');
const { logAudit } = require('../utils/auditLogger');

function generateToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Organizer Registration
async function registerOrganizer(req, res) {
  try {
    const { full_name, email, password, confirm_password, organization, bio } = req.body;

    if (!full_name || !email || !password) {
      return error(res, 'Full name, email, and password are required.', 400);
    }

    if (password !== confirm_password) {
      return error(res, 'Passwords do not match.', 400);
    }

    if (password.length < 6) {
      return error(res, 'Password must be at least 6 characters long.', 400);
    }

    // Check if email already registered
    const existing = await db.query('SELECT id FROM organizers WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return error(res, 'An organizer account with this email already exists.', 409);
    }

    const orgId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO organizers (id, full_name, email, password_hash, organization, bio)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, organization, bio, is_active, created_at`,
      [orgId, full_name.trim(), email.toLowerCase().trim(), passwordHash, organization || null, bio || null]
    );

    const organizer = result.rows[0];
    const token = generateToken({
      id: organizer.id,
      email: organizer.email,
      name: organizer.full_name,
      role: 'organizer'
    });

    await logAudit({
      actorId: organizer.id,
      actorRole: 'organizer',
      action: 'ORGANIZER_REGISTERED',
      details: { email: organizer.email }
    });

    return success(res, { token, user: { ...organizer, role: 'organizer' } }, 'Organizer registered successfully.', 201);
  } catch (err) {
    console.error('[Auth Error]:', err);
    return error(res, 'Organizer registration failed.', 500, err.message);
  }
}

// Organizer Login
async function loginOrganizer(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'Email and password are required.', 400);
    }

    const result = await db.query(
      `SELECT * FROM organizers WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return error(res, 'Invalid credentials.', 401);
    }

    const organizer = result.rows[0];

    if (!organizer.is_active) {
      return error(res, 'Your organizer account has been suspended by the platform administrator.', 403);
    }

    const isMatch = await bcrypt.compare(password, organizer.password_hash);
    if (!isMatch) {
      return error(res, 'Invalid credentials.', 401);
    }

    const token = generateToken({
      id: organizer.id,
      email: organizer.email,
      name: organizer.full_name,
      role: 'organizer'
    });

    await logAudit({
      actorId: organizer.id,
      actorRole: 'organizer',
      action: 'ORGANIZER_LOGIN',
      details: { email: organizer.email }
    });

    const { password_hash, ...safeUser } = organizer;
    return success(res, { token, user: { ...safeUser, role: 'organizer' } }, 'Login successful.');
  } catch (err) {
    console.error('[Auth Error]:', err);
    return error(res, 'Organizer login failed.', 500, err.message);
  }
}

// Participant Login
// Supports: PIN or EventId + participant_code + access_code
async function loginParticipant(req, res) {
  try {
    const { event_id, pin, participant_code, access_code } = req.body;

    if (!participant_code || !access_code) {
      return error(res, 'Participant ID and Access Code are required.', 400);
    }

    let targetEventId = event_id;

    // If PIN is provided, find event matching PIN
    if (pin) {
      const allEvents = await db.query(`SELECT id, pin_hash, visibility FROM events WHERE is_deleted = FALSE`);
      let matchedEventId = null;

      for (const ev of allEvents.rows) {
        if (ev.pin_hash && (await bcrypt.compare(pin.trim(), ev.pin_hash))) {
          matchedEventId = ev.id;
          break;
        }
      }

      if (!matchedEventId) {
        return error(res, 'Invalid contest PIN.', 401);
      }
      targetEventId = matchedEventId;
    }

    if (!targetEventId) {
      return error(res, 'Contest PIN or Contest ID is required.', 400);
    }

    // Find participant
    const partRes = await db.query(
      `SELECT p.*, e.name as event_name, e.status as event_status, e.visibility
       FROM participants p
       JOIN events e ON p.event_id = e.id
       WHERE p.event_id = $1 AND UPPER(p.participant_code) = UPPER($2)`,
      [targetEventId, participant_code.trim()]
    );

    if (partRes.rows.length === 0) {
      return error(res, 'Participant not found for this contest.', 404);
    }

    const participant = partRes.rows[0];

    if (participant.status !== 'active') {
      return error(res, `Participant account is currently ${participant.status}.`, 403);
    }

    // Verify access code
    const isMatch = await bcrypt.compare(access_code.trim(), participant.access_code_hash);
    if (!isMatch) {
      return error(res, 'Invalid access code.', 401);
    }

    const token = generateToken({
      id: participant.id,
      participantId: participant.id,
      eventId: participant.event_id,
      participantCode: participant.participant_code,
      name: participant.display_name,
      role: 'participant'
    });

    await logAudit({
      eventId: participant.event_id,
      actorId: participant.id,
      actorRole: 'participant',
      action: 'PARTICIPANT_LOGIN',
      details: { participant_code: participant.participant_code }
    });

    const { access_code_hash, ...safeParticipant } = participant;
    return success(res, { token, user: { ...safeParticipant, role: 'participant' } }, 'Participant login successful.');
  } catch (err) {
    console.error('[Auth Error]:', err);
    return error(res, 'Participant login failed.', 500, err.message);
  }
}

// Platform Administrator Login
async function loginAdmin(req, res) {
  try {
    const { username_or_email, password } = req.body;

    if (!username_or_email || !password) {
      return error(res, 'Username/Email and password are required.', 400);
    }

    const result = await db.query(
      `SELECT * FROM platform_admins WHERE username = $1 OR email = $1`,
      [username_or_email.trim()]
    );

    if (result.rows.length === 0) {
      return error(res, 'Invalid administrator credentials.', 401);
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return error(res, 'Invalid administrator credentials.', 401);
    }

    const token = generateToken({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      name: admin.username,
      role: 'admin'
    });

    await logAudit({
      actorId: admin.id,
      actorRole: 'admin',
      action: 'ADMIN_LOGIN',
      details: { username: admin.username }
    });

    const { password_hash, ...safeAdmin } = admin;
    return success(res, { token, user: { ...safeAdmin, role: 'admin' } }, 'Admin login successful.');
  } catch (err) {
    console.error('[Auth Error]:', err);
    return error(res, 'Admin login failed.', 500, err.message);
  }
}

// Current User Profile (/api/auth/me)
async function getMe(req, res) {
  try {
    const { id, role } = req.user;

    if (role === 'organizer') {
      const result = await db.query(
        `SELECT id, full_name, email, bio, organization, is_active, created_at FROM organizers WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return error(res, 'Organizer not found.', 404);
      return success(res, { user: { ...result.rows[0], role: 'organizer' } });
    }

    if (role === 'participant') {
      const result = await db.query(
        `SELECT p.id, p.event_id, p.participant_code, p.display_name, p.status, e.name as event_name, e.status as event_status
         FROM participants p
         JOIN events e ON p.event_id = e.id
         WHERE p.id = $1`,
        [id]
      );
      if (result.rows.length === 0) return error(res, 'Participant not found.', 404);
      return success(res, { user: { ...result.rows[0], role: 'participant' } });
    }

    if (role === 'admin') {
      const result = await db.query(
        `SELECT id, username, email, created_at FROM platform_admins WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return error(res, 'Admin not found.', 404);
      return success(res, { user: { ...result.rows[0], role: 'admin' } });
    }

    return error(res, 'Unknown role.', 400);
  } catch (err) {
    console.error('[Auth Error]:', err);
    return error(res, 'Failed to fetch user profile.', 500, err.message);
  }
}

module.exports = {
  registerOrganizer,
  loginOrganizer,
  loginParticipant,
  loginAdmin,
  getMe
};
