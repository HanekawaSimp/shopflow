const axios = require('axios');
const config = require('../config');

/**
 * Middleware to verify JWT token by calling the auth service.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'No token provided' });
  }

  try {
    const response = await axios.get(`${config.services.authUrl}/api/auth/verify`, {
      headers: { Authorization: authHeader },
      timeout: 5000,
    });

    req.user = response.data.user;
    next();
  } catch (err) {
    if (err.response) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token' });
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
      console.error('[AUTH] Auth service unreachable');
      return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Auth service unreachable' });
    }
    console.error('[AUTH] Verification error:', err.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Authentication failed' });
  }
}

/**
 * Middleware to check user role.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
