import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncH, badRequest, unauthorized, forbidden } from '../lib/http.js';
import { verifyPassword, signToken, requireAdmin } from '../lib/auth.js';

const router = Router();

// POST /api/auth/login — only admin-role users may log in here.
router.post('/login', asyncH(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw badRequest('Email and password are required.');

  const { rows } = await query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw unauthorized('Incorrect email or password.');
  }
  if (user.role !== 'admin') {
    throw forbidden('This dashboard is for admins only. Customer accounts cannot log in here.');
  }
  delete user.password_hash;
  res.json({ user, token: signToken(user) });
}));

// GET /api/auth/me
router.get('/me', requireAdmin, asyncH(async (req, res) => {
  const { rows } = await query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) throw unauthorized();
  res.json({ user: rows[0] });
}));

router.post('/logout', (req, res) => res.json({ ok: true }));

export default router;
