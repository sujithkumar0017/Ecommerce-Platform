import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncH, badRequest } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/profile
router.get('/', asyncH(async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json({ user: rows[0] });
}));

// PUT /api/profile — edit name / phone (email left immutable for simplicity)
router.put('/', asyncH(async (req, res) => {
  const { name, phone } = req.body || {};
  if (!name || !name.trim()) throw badRequest('Name cannot be empty.');
  const { rows } = await query(
    `UPDATE users SET name = $1, phone = $2 WHERE id = $3
     RETURNING id, name, email, phone, role, created_at`,
    [name.trim(), phone || null, req.user.id]
  );
  res.json({ user: rows[0] });
}));

export default router;
