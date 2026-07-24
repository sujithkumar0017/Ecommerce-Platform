import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncH, badRequest, forbidden, notFound, conflict } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

const EDIT_WINDOW_MINUTES = 30; // reviews are editable for 30 min after posting

// GET /api/products/:productId/reviews  (public)
router.get('/products/:productId/reviews', asyncH(async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.rating, r.title, r.body, r.created_at, r.updated_at, u.name AS author
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1 ORDER BY r.created_at DESC`, [req.params.productId]);
  res.json({ reviews: rows });
}));

// Everything below requires auth.
router.use(requireAuth);

// Has the user actually received (delivered) this product? Returns the entitling order_item id.
async function findDeliveredItem(userId, productId) {
  const { rows } = await query(
    `SELECT oi.id
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
     ORDER BY oi.id LIMIT 1`, [userId, productId]);
  return rows[0]?.id || null;
}

// GET /api/reviews/eligibility/:productId — can the user review, and existing review?
router.get('/reviews/eligibility/:productId', asyncH(async (req, res) => {
  const productId = req.params.productId;
  const deliveredItem = await findDeliveredItem(req.user.id, productId);
  const existing = await query(
    'SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2', [productId, req.user.id]);
  const review = existing.rows[0] || null;
  res.json({
    can_review: !!deliveredItem && !review,
    has_delivered: !!deliveredItem,
    review,
    can_edit: review ? new Date(review.edit_deadline) > new Date() : false,
  });
}));

// POST /api/reviews  { product_id, rating, title?, body? }
router.post('/reviews', asyncH(async (req, res) => {
  const { product_id, rating, title, body } = req.body || {};
  const r = parseInt(rating, 10);
  if (!product_id) throw badRequest('Product is required.');
  if (!Number.isInteger(r) || r < 1 || r > 5) throw badRequest('Rating must be between 1 and 5 stars.');

  const deliveredItem = await findDeliveredItem(req.user.id, product_id);
  if (!deliveredItem) {
    throw forbidden('You can only review a product you have received in a past order.');
  }

  const dup = await query('SELECT id FROM reviews WHERE product_id = $1 AND user_id = $2',
    [product_id, req.user.id]);
  if (dup.rowCount) throw conflict('You have already reviewed this product.');

  const deadline = new Date(Date.now() + EDIT_WINDOW_MINUTES * 60 * 1000);
  const { rows } = await query(
    `INSERT INTO reviews (product_id, user_id, order_item_id, rating, title, body, edit_deadline)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [product_id, req.user.id, deliveredItem, r, title || null, body || null, deadline]);
  res.status(201).json({ review: rows[0] });
}));

// PUT /api/reviews/:id — edit own review within the window
router.put('/reviews/:id', asyncH(async (req, res) => {
  const { rating, title, body } = req.body || {};
  const { rows } = await query('SELECT * FROM reviews WHERE id = $1', [req.params.id]);
  const review = rows[0];
  if (!review) throw notFound('Review not found.');
  if (review.user_id !== req.user.id) throw forbidden('You can only edit your own review.');
  if (new Date(review.edit_deadline) < new Date()) {
    throw conflict('The edit window for this review has closed.');
  }
  const r = rating != null ? parseInt(rating, 10) : review.rating;
  if (!Number.isInteger(r) || r < 1 || r > 5) throw badRequest('Rating must be between 1 and 5 stars.');

  const upd = await query(
    `UPDATE reviews SET rating = $1, title = $2, body = $3, updated_at = now()
     WHERE id = $4 RETURNING *`,
    [r, title ?? review.title, body ?? review.body, review.id]);
  res.json({ review: upd.rows[0] });
}));

export default router;
