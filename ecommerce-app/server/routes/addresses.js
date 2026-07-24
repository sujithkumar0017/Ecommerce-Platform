import { Router } from 'express';
import { query, withTransaction } from '../db/pool.js';
import { asyncH, badRequest, notFound } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();
router.use(requireAuth);

const REQUIRED = ['recipient_name', 'phone', 'line1', 'city', 'state', 'postal_code'];

function validate(body) {
  for (const f of REQUIRED) {
    if (!body?.[f] || !String(body[f]).trim()) {
      throw badRequest(`Missing required address field: ${f.replace('_', ' ')}.`);
    }
  }
}

// GET /api/addresses
router.get('/', asyncH(async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
    [req.user.id]
  );
  res.json({ addresses: rows });
}));

// POST /api/addresses
router.post('/', asyncH(async (req, res) => {
  const b = req.body || {};
  validate(b);
  const address = await withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT COUNT(*)::int AS n FROM addresses WHERE user_id = $1',
      [req.user.id]
    );
    // First address is default automatically; otherwise honor the flag.
    const makeDefault = existing.rows[0].n === 0 ? true : !!b.is_default;
    if (makeDefault) {
      await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }
    const { rows } = await client.query(
      `INSERT INTO addresses
        (user_id, label, recipient_name, phone, line1, line2, city, state, postal_code, country, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.id, b.label || null, b.recipient_name, b.phone, b.line1, b.line2 || null,
       b.city, b.state, b.postal_code, b.country || 'India', makeDefault]
    );
    return rows[0];
  });
  res.status(201).json({ address });
}));

// PUT /api/addresses/:id
router.put('/:id', asyncH(async (req, res) => {
  const b = req.body || {};
  validate(b);
  const owned = await query('SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]);
  if (!owned.rowCount) throw notFound('Address not found.');

  const address = await withTransaction(async (client) => {
    if (b.is_default) {
      await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }
    const { rows } = await client.query(
      `UPDATE addresses SET label=$1, recipient_name=$2, phone=$3, line1=$4, line2=$5,
         city=$6, state=$7, postal_code=$8, country=$9, is_default=$10
       WHERE id=$11 AND user_id=$12 RETURNING *`,
      [b.label || null, b.recipient_name, b.phone, b.line1, b.line2 || null, b.city, b.state,
       b.postal_code, b.country || 'India', !!b.is_default, req.params.id, req.user.id]
    );
    return rows[0];
  });
  res.json({ address });
}));

// PUT /api/addresses/:id/default
router.put('/:id/default', asyncH(async (req, res) => {
  const owned = await query('SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]);
  if (!owned.rowCount) throw notFound('Address not found.');
  await withTransaction(async (client) => {
    await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    await client.query('UPDATE addresses SET is_default = true WHERE id = $1', [req.params.id]);
  });
  res.json({ ok: true });
}));

// DELETE /api/addresses/:id
router.delete('/:id', asyncH(async (req, res) => {
  const { rowCount } = await query('DELETE FROM addresses WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]);
  if (!rowCount) throw notFound('Address not found.');
  res.json({ ok: true });
}));

export default router;
