import { Router } from 'express';
import { query, withTransaction } from '../db/pool.js';
import { asyncH, badRequest, notFound, conflict } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';

const router = Router();
router.use(requireAdmin);

// Allowed forward transitions the admin can drive through fulfillment.
const NEXT = {
  paid: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
};
const TIMESTAMP_COL = {
  packed: 'packed_at', shipped: 'shipped_at', delivered: 'delivered_at', cancelled: 'cancelled_at',
};

// GET /api/orders?status=&q=  — all orders (admin sees everyone's)
router.get('/', asyncH(async (req, res) => {
  const { status, q } = req.query;
  const params = [];
  const where = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };
  if (status) where.push(`o.status = ${p(status)}`);
  if (q) {
    const l = p(`%${q}%`);
    where.push(`(o.order_number ILIKE ${l} OR u.name ILIKE ${l} OR u.email ILIKE ${l})`);
  }
  const sql = `
    SELECT o.id, o.order_number, o.status, o.payment_status, o.total, o.placed_at,
           o.tracking_carrier, o.tracking_number,
           u.id AS customer_id, u.name AS customer_name, u.email AS customer_email,
           COALESCE(SUM(oi.quantity),0)::int AS item_count
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    GROUP BY o.id, u.id
    ORDER BY o.placed_at DESC`;
  const { rows } = await query(sql, params);
  res.json({ orders: rows });
}));

// GET /api/orders/:id — full order with items + customer
router.get('/:id', asyncH(async (req, res) => {
  const { rows } = await query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
     FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = $1`, [req.params.id]);
  const order = rows[0];
  if (!order) throw notFound('Order not found.');
  const items = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [order.id]);
  res.json({ order: { ...order, items: items.rows } });
}));

// PATCH /api/orders/:id/status  { status, tracking_carrier?, tracking_number? }
router.patch('/:id/status', asyncH(async (req, res) => {
  const { status, tracking_carrier, tracking_number } = req.body || {};
  if (!status) throw badRequest('A target status is required.');

  const order = await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [req.params.id]);
    const o = rows[0];
    if (!o) throw notFound('Order not found.');

    const allowed = NEXT[o.status] || [];
    if (!allowed.includes(status)) {
      throw conflict(`Cannot move an order from "${o.status}" to "${status}".`);
    }
    // Shipping requires tracking info.
    if (status === 'shipped' && !(tracking_number || o.tracking_number)) {
      throw badRequest('Add a tracking number before marking as shipped.');
    }

    // If cancelling, restock.
    if (status === 'cancelled') {
      const items = await client.query('SELECT variant_id, quantity FROM order_items WHERE order_id = $1', [o.id]);
      for (const it of items.rows) {
        if (it.variant_id) {
          await client.query('UPDATE product_variants SET stock = stock + $1 WHERE id = $2',
            [it.quantity, it.variant_id]);
        }
      }
    }

    const col = TIMESTAMP_COL[status];
    const { rows: upd } = await client.query(
      `UPDATE orders
       SET status = $1,
           ${col ? `${col} = now(),` : ''}
           tracking_carrier = COALESCE($2, tracking_carrier),
           tracking_number  = COALESCE($3, tracking_number)
       WHERE id = $4 RETURNING *`,
      [status, tracking_carrier ?? null, tracking_number ?? null, o.id]);
    return upd[0];
  });
  res.json({ order });
}));

export default router;
