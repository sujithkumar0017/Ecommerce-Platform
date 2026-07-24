import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncH, badRequest, conflict, unauthorized } from '../lib/http.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from '../lib/auth.js';

const router = Router();

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/signup
router.post('/signup', asyncH(async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !password) {
    throw badRequest('Name, email, and password are required.');
  }
  if (!emailRe.test(email)) throw badRequest('Please enter a valid email address.');
  if (String(password).length < 6) {
    throw badRequest('Password must be at least 6 characters.');
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rowCount > 0) throw conflict('An account with this email already exists.');

  const password_hash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, phone, role, created_at`,
    [name.trim(), email.toLowerCase(), phone || null, password_hash]
  );
  const user = rows[0];
  res.status(201).json({ user, token: signToken(user) });
}));

// POST /api/auth/login
router.post('/login', asyncH(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw badRequest('Email and password are required.');

  const { rows } = await query(
    'SELECT id, name, email, phone, role, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw unauthorized('Incorrect email or password.');
  }
  delete user.password_hash;
  res.json({ user, token: signToken(user) });
}));

// POST /api/auth/logout — JWT is stateless; client just drops the token.
router.post('/logout', (req, res) => {
  res.json({ ok: true, message: 'Logged out.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, asyncH(async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0]) throw unauthorized();
  res.json({ user: rows[0] });
}));

export default router;
