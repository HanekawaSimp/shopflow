const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { pool } = require('../db');

const router = express.Router();

// Middleware: require valid JWT
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token' });
  }
}

// Middleware: require admin role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required' });
  }
  next();
}

// GET /api/users — list all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT id, email, name, role, is_active, last_login, created_at, updated_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      users: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[USERS] List error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to list users' });
  }
});

// GET /api/users/:id — get user by ID (admin or self)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (req.user.role !== 'admin' && req.user.userId !== userId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT id, email, name, role, is_active, last_login, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[USERS] Get error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to get user' });
  }
});

// PATCH /api/users/:id — update user (admin or self with restrictions)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.userId === userId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied' });
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    // Users can update their own name and password
    if (req.body.name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(req.body.name);
    }

    if (req.body.password) {
      if (req.body.password.length < 8) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' });
      }
      paramCount++;
      const hash = await bcrypt.hash(req.body.password, config.bcrypt.saltRounds);
      updates.push(`password_hash = $${paramCount}`);
      values.push(hash);
    }

    // Only admins can update role and active status
    if (isAdmin) {
      if (req.body.role) {
        if (!['user', 'admin', 'manager'].includes(req.body.role)) {
          return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid role' });
        }
        paramCount++;
        updates.push(`role = $${paramCount}`);
        values.push(req.body.role);
      }

      if (typeof req.body.is_active === 'boolean') {
        paramCount++;
        updates.push(`is_active = $${paramCount}`);
        values.push(req.body.is_active);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'No valid fields to update' });
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, email, name, role, is_active, updated_at`,
      [...values, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }

    console.log(`[USERS] Updated user ${userId} by ${req.user.email}`);
    res.json({ message: 'User updated', user: result.rows[0] });
  } catch (err) {
    console.error('[USERS] Update error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update user' });
  }
});

// DELETE /api/users/:id — deactivate user (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (req.user.userId === userId) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Cannot deactivate your own account' });
    }

    const result = await pool.query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING id, email`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }

    console.log(`[USERS] Deactivated user ${result.rows[0].email} by ${req.user.email}`);
    res.json({ message: 'User deactivated', user: result.rows[0] });
  } catch (err) {
    console.error('[USERS] Delete error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to deactivate user' });
  }
});

module.exports = router;
