import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncH, badRequest, notFound } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { getOrCreateCartId, buildCartResponse } from '../lib/cart.js';

const router = Router();
router.use(requireAuth);

// GET /api/cart?coupon=CODE
router.get('/', asyncH(async (req, res) => {
  res.json(await buildCartResponse(req.user.id, req.query.coupon || null));
}));

// POST /api/cart/items  { variant_id, quantity }
router.post('/items', asyncH(async (req, res) => {
  const { variant_id, quantity = 1 } = req.body || {};
  const qty = parseInt(quantity, 10);
  if (!variant_id || !Number.isInteger(qty) || qty < 1) {
    throw badRequest('A valid variant and quantity are required.');
  }

  const { rows } = await query(
    'SELECT id, stock, is_active FROM product_variants WHERE id = $1', [variant_id]);
  const variant = rows[0];
  if (!variant || !variant.is_active) throw notFound('That product option is unavailable.');

  const cartId = await getOrCreateCartId(req.user.id);
  const existing = await query(
    'SELECT quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2', [cartId, variant_id]);
  const newQty = (existing.rows[0]?.quantity || 0) + qty;

  if (newQty > variant.stock) {
    throw badRequest(`Only ${variant.stock} in stock.`);
  }

  await query(
    `INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, variant_id) DO UPDATE SET quantity = $3`,
    [cartId, variant_id, newQty]
  );
  res.status(201).json(await buildCartResponse(req.user.id, req.query.coupon || null));
}));

// PUT /api/cart/items/:variantId  { quantity }
router.put('/items/:variantId', asyncH(async (req, res) => {
  const qty = parseInt(req.body?.quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) throw badRequest('Quantity must be at least 1.');

  const cartId = await getOrCreateCartId(req.user.id);
  const { rows } = await query(
    'SELECT stock FROM product_variants WHERE id = $1', [req.params.variantId]);
  if (!rows[0]) throw notFound('Product option not found.');
  if (qty > rows[0].stock) throw badRequest(`Only ${rows[0].stock} in stock.`);

  const upd = await query(
    'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND variant_id = $3',
    [qty, cartId, req.params.variantId]);
  if (!upd.rowCount) throw notFound('Item not in cart.');
  res.json(await buildCartResponse(req.user.id, req.query.coupon || null));
}));

// DELETE /api/cart/items/:variantId
router.delete('/items/:variantId', asyncH(async (req, res) => {
  const cartId = await getOrCreateCartId(req.user.id);
  await query('DELETE FROM cart_items WHERE cart_id = $1 AND variant_id = $2',
    [cartId, req.params.variantId]);
  res.json(await buildCartResponse(req.user.id, req.query.coupon || null));
}));

// DELETE /api/cart  — clear cart
router.delete('/', asyncH(async (req, res) => {
  const cartId = await getOrCreateCartId(req.user.id);
  await query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
  res.json(await buildCartResponse(req.user.id));
}));

// POST /api/cart/coupon  { code }  — validate & echo back applied cart
router.post('/coupon', asyncH(async (req, res) => {
  const code = (req.body?.code || '').trim();
  if (!code) throw badRequest('Enter a coupon code.');
  const result = await buildCartResponse(req.user.id, code);
  if (result.coupon_error) throw badRequest(result.coupon_error);
  res.json(result);
}));

export default router;
