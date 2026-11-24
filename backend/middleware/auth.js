const jwt = require('jsonwebtoken');
const config = require('../config/config');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function requireRole(roles) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user || !roleArray.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of roles: ${roleArray.join(', ')}`
      });
    }
    next();
  };
}

const requireAdmin = requireRole(['admin']);
const requireOrganizer = requireRole(['organizer', 'admin']);
const requireParticipant = requireRole(['participant']);

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireOrganizer,
  requireParticipant
};
