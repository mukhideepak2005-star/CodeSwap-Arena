const db = require('../database/db');

function checkContestAccess(requiredPermission = 'view_contest') {
  return async (req, res, next) => {
    try {
      const eventId = req.params.id || req.params.eventId || req.body.eventId || req.query.eventId;

      if (!eventId) {
        return res.status(400).json({ success: false, message: 'Event ID is required for authorization.' });
      }

      // Admins bypass contest ownership checks but actions are tracked
      if (req.user && req.user.role === 'admin') {
        const eventRes = await db.query('SELECT * FROM events WHERE id = $1 AND is_deleted = FALSE', [eventId]);
        if (eventRes.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Contest not found.' });
        }
        req.contest = eventRes.rows[0];
        req.isOwner = true;
        req.isAdminBypass = true;
        return next();
      }

      // Participants: check if this participant belongs to this specific contest
      if (req.user && req.user.role === 'participant') {
        if (req.user.eventId !== eventId) {
          return res.status(403).json({ success: false, message: 'You are not enrolled in this contest.' });
        }
        const eventRes = await db.query('SELECT * FROM events WHERE id = $1 AND is_deleted = FALSE', [eventId]);
        if (eventRes.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Contest not found.' });
        }
        req.contest = eventRes.rows[0];
        return next();
      }

      // Organizers: check ownership or co-organizer permissions
      if (req.user && req.user.role === 'organizer') {
        const eventRes = await db.query('SELECT * FROM events WHERE id = $1 AND is_deleted = FALSE', [eventId]);
        if (eventRes.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'Contest not found.' });
        }

        const contest = eventRes.rows[0];

        // 1. Primary Owner check
        if (contest.organizer_id === req.user.id) {
          req.contest = contest;
          req.isOwner = true;
          return next();
        }

        // 2. Co-Organizer Member check
        const memberRes = await db.query(
          `SELECT * FROM organizer_members 
           WHERE event_id = $1 AND (organizer_id = $2 OR invited_email = $3) AND status = 'accepted'`,
          [eventId, req.user.id, req.user.email]
        );

        if (memberRes.rows.length > 0) {
          const member = memberRes.rows[0];
          const permissions = typeof member.permissions === 'string' 
            ? JSON.parse(member.permissions) 
            : member.permissions;

          if (requiredPermission && !permissions[requiredPermission]) {
            // Log unauthorized attempt to audit logs
            await db.query(
              `INSERT INTO audit_logs (id, event_id, actor_id, actor_role, action, details, ip_address)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                require('uuid').v4(),
                eventId,
                req.user.id,
                req.user.role,
                'PERMISSION_DENIED',
                JSON.stringify({ requiredPermission, path: req.originalUrl }),
                req.ip || '127.0.0.1'
              ]
            );

            return res.status(403).json({
              success: false,
              message: `Co-organizer lacks '${requiredPermission}' permission for this contest.`
            });
          }

          req.contest = contest;
          req.isOwner = false;
          req.memberPermissions = permissions;
          return next();
        }

        // Neither owner nor co-organizer
        await db.query(
          `INSERT INTO audit_logs (id, event_id, actor_id, actor_role, action, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            require('uuid').v4(),
            eventId,
            req.user.id,
            req.user.role,
            'UNAUTHORIZED_CONTEST_ACCESS_ATTEMPT',
            JSON.stringify({ path: req.originalUrl }),
            req.ip || '127.0.0.1'
          ]
        );

        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to access or manage this contest.'
        });
      }

      return res.status(401).json({ success: false, message: 'Unauthenticated or unrecognized role.' });
    } catch (err) {
      console.error('[ContestGuard Error]:', err);
      return res.status(500).json({ success: false, message: 'Server authorization check failed.' });
    }
  };
}

module.exports = {
  checkContestAccess
};
