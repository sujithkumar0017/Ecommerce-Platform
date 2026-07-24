import { Router } from 'express';
import { query, withTransaction } from '../db/pool.js';
import { asyncH, badRequest, notFound, conflict } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { getOrCreateCartId, getCartItems } from '../lib/cart.js';
import { computeTotals } from '../lib/pricing.js';

const router = Router();
router.use(requireAuth);

function genOrderNumber(id) {
  const y = new Date().getFullYear();
  return `SK-${y}-${String(id).padStart(6, '0')}`;
}

// POST /api/orders  { address_id, coupon_code? }
// Places an order from the current cart. Snapshots price/name/variant into order_items.
router.post('/', asyncH(async (req, res) => {
  const { address_id, coupon_code } = req.body || {};
  if (!address_id) throw badRequest('Please choose a delivery address.');

  const order = await withTransaction(async (client) => {
    // 1. Address (must belong to user) — snapshot it.
    const addr = await client.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2', [address_id, req.user.id]);
    if (!addr.rowCount) throw notFound('Delivery address not found.');
    const a = addr.rows[0];

    // 2. Cart items — lock the variant rows to prevent oversell.
    const cartId = await getOrCreateCartId(req.user.id, client);
    const items = await getCartItems(cartId, client);
    if (items.length === 0) throw badRequest('Your cart is empty.');

    for (const it of items) {
      const locked = await client.query(
        'SELECT stock, is_active FROM product_variants WHERE id = $1 FOR UPDATE', [it.variant_id]);
      const v = locked.rows[0];
      if (!v || !v.is_active) throw conflict(`"${it.product_name}" is no longer available.`);
      if (it.quantity > v.stock) {
        throw conflict(`Only ${v.stock} of "${it.product_name}" left in stock.`);
      }
    }

    // 3. Coupon (optional) — validated inside computeTotals.
    let coupon = null;
    if (coupon_code) {
      const c = await client.query('SELECT * FROM coupons WHERE UPPER(code) = UPPER($1)', [coupon_code]);
      if (!c.rowCount) throw badRequest('Invalid coupon code.');
      coupon = c.rows[0];
    }
    const totals = computeTotals(items, coupon); // throws friendly error if coupon invalid

    // 4. Insert order (get id to build order_number, then update).
    const ins = await client.query(
      `INSERT INTO orders
        (order_number, user_id, status, payment_status, subtotal, discount, tax, shipping_fee, total,
         coupon_code, ship_recipient, ship_phone, ship_line1, ship_line2, ship_city, ship_state,
         ship_postal, ship_country)
       VALUES ('PENDING', $1, 'placed', 'unpaid', $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [req.user.id, totals.subtotal, totals.discount, totals.tax, totals.shipping_fee, totals.total,
       coupon?.code || null, a.recipient_name, a.phone, a.line1, a.line2, a.city, a.state,
       a.postal_code, a.country]
    );
    const orderId = ins.rows[0].id;
    const orderNumber = genOrderNumber(orderId);
    await client.query('UPDATE orders SET order_number = $1 WHERE id = $2', [orderNumber, orderId]);

    // 5. Immutable order_items (snapshots) + decrement stock.
    for (const it of items) {
      const lineTotal = Math.round(Number(it.unit_price) * it.quantity * 100) / 100;
      await client.query(
        `INSERT INTO order_items
          (order_id, product_id, variant_id, product_name, variant_name, sku, unit_price, quantity, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [orderId, it.product_id, it.variant_id, it.product_name, it.variant_name, it.sku,
         it.unit_price, it.quantity, lineTotal]
      );
      await client.query('UPDATE product_variants SET stock = stock - $1 WHERE id = $2',
        [it.quantity, it.variant_id]);
    }

    // 6. Clear the cart.
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    return { id: orderId, order_number: orderNumber };
  });

  res.status(201).json({ order });
}));

// POST /api/orders/:id/pay  — mock payment: marks order paid.
router.post('/:id/pay', asyncH(async (req, res) => {
  const order = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [req.params.id, req.user.id]);
    const o = rows[0];
    if (!o) throw notFound('Order not found.');
    if (o.status === 'cancelled') throw conflict('This order was cancelled.');
    if (o.payment_status === 'paid') throw conflict('This order is already paid.');

    const upd = await client.query(
      `UPDATE orders SET payment_status = 'paid', status = 'paid', paid_at = now()
       WHERE id = $1 RETURNING *`, [o.id]);
    return upd.rows[0];
  });
  res.json({ order });
}));

// GET /api/orders — order history (list)
router.get('/', asyncH(async (req, res) => {
  const { rows } = await query(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.total, o.placed_at,
            COALESCE(SUM(oi.quantity), 0)::int AS item_count
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = $1
     GROUP BY o.id
     ORDER BY o.placed_at DESC`,
    [req.user.id]);
  res.json({ orders: rows });
}));

// GET /api/orders/:id — single order with its immutable line items
router.get('/:id', asyncH(async (req, res) => {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]);
  const order = rows[0];
  if (!order) throw notFound('Order not found.');
  const items = await query(
    `SELECT id, product_id, variant_id, product_name, variant_name, sku, unit_price, quantity, line_total
     FROM order_items WHERE order_id = $1 ORDER BY id`, [order.id]);
  res.json({ order: { ...order, items: items.rows } });
}));

// POST /api/orders/:id/cancel — allowed only before it ships.
router.post('/:id/cancel', asyncH(async (req, res) => {
  const order = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [req.params.id, req.user.id]);
    const o = rows[0];
    if (!o) throw notFound('Order not found.');
    if (o.status === 'cancelled') throw conflict('This order is already cancelled.');
    if (['shipped', 'delivered'].includes(o.status)) {
      throw conflict('This order has already shipped and can no longer be cancelled.');
    }

    // Restock the items.
    const items = await client.query(
      'SELECT variant_id, quantity FROM order_items WHERE order_id = $1', [o.id]);
    for (const it of items.rows) {
      if (it.variant_id) {
        await client.query('UPDATE product_variants SET stock = stock + $1 WHERE id = $2',
          [it.quantity, it.variant_id]);
      }
    }
    const upd = await client.query(
      `UPDATE orders SET status = 'cancelled', cancelled_at = now() WHERE id = $1 RETURNING *`, [o.id]);
    return upd.rows[0];
  });
  res.json({ order });
}));

// GET /api/orders/:id/track — delivery status timeline for a shipped order
router.get('/:id/track', asyncH(async (req, res) => {
  const { rows } = await query(
    `SELECT order_number, status, tracking_carrier, tracking_number,
            placed_at, paid_at, packed_at, shipped_at, delivered_at, cancelled_at
     FROM orders WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
  const o = rows[0];
  if (!o) throw notFound('Order not found.');

  const timeline = [
    { step: 'placed', at: o.placed_at },
    { step: 'paid', at: o.paid_at },
    { step: 'packed', at: o.packed_at },
    { step: 'shipped', at: o.shipped_at },
    { step: 'delivered', at: o.delivered_at },
  ].filter((s) => s.at);
  if (o.cancelled_at) timeline.push({ step: 'cancelled', at: o.cancelled_at });

  res.json({
    order_number: o.order_number,
    status: o.status,
    tracking: { carrier: o.tracking_carrier, number: o.tracking_number },
    timeline,
  });
}));

export default router;
