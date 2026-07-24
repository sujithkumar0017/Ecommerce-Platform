// The heart of the admin app: prove the user <-> product link BOTH ways,
// always traced THROUGH orders/order_items (never a direct user-product link).
import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncH, badRequest, notFound } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';

const router = Router();
router.use(requireAdmin);

// ─── Customer search (find a customer to drill into) ───
// GET /api/trace/customers?q=  — match by name, email, phone, or id
router.get('/customers', asyncH(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ customers: [] });
  const isId = /^\d+$/.test(q);
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at,
            COUNT(DISTINCT o.id)::int AS order_count
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     WHERE u.role = 'customer' AND (
        u.name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1 ${isId ? 'OR u.id = $2' : ''}
     )
     GROUP BY u.id
     ORDER BY u.name
     LIMIT 25`,
    isId ? [`%${q}%`, Number(q)] : [`%${q}%`]);
  res.json({ customers: rows });
}));

// GET /api/trace/customers/:id/purchases
// Every product this customer ever bought — through their actual orders.
router.get('/customers/:id/purchases', asyncH(async (req, res) => {
  const cust = await query('SELECT id, name, email, phone FROM users WHERE id = $1', [req.params.id]);
  if (!cust.rowCount) throw notFound('Customer not found.');

  const { rows } = await query(
    `SELECT oi.id AS order_item_id, oi.product_id, oi.product_name, oi.variant_name, oi.sku,
            oi.unit_price, oi.quantity, oi.line_total,
            o.id AS order_id, o.order_number, o.status AS order_status, o.placed_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = $1
     ORDER BY o.placed_at DESC, oi.id`,
    [req.params.id]);

  res.json({ customer: cust.rows[0], purchases: rows });
}));

// ─── Product search ───
// GET /api/trace/products?q=  — match by name, sku, or id
router.get('/products', asyncH(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ products: [] });
  const isId = /^\d+$/.test(q);
  const { rows } = await query(
    `SELECT DISTINCT p.id, p.name, p.category, p.brand
     FROM products p
     LEFT JOIN product_variants v ON v.product_id = p.id
     WHERE p.name ILIKE $1 OR v.sku ILIKE $1 ${isId ? 'OR p.id = $2' : ''}
     ORDER BY p.name
     LIMIT 25`,
    isId ? [`%${q}%`, Number(q)] : [`%${q}%`]);
  res.json({ products: rows });
}));

// GET /api/trace/products/:id/buyers
// Every customer who ever bought this product — through their actual orders.
router.get('/products/:id/buyers', asyncH(async (req, res) => {
  const prod = await query('SELECT id, name, category, brand FROM products WHERE id = $1', [req.params.id]);
  if (!prod.rowCount) throw notFound('Product not found.');

  const { rows } = await query(
    `SELECT u.id AS customer_id, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
            oi.sku, oi.variant_name, oi.unit_price, oi.quantity, oi.line_total,
            o.id AS order_id, o.order_number, o.status AS order_status, o.placed_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN users u ON u.id = o.user_id
     WHERE oi.product_id = $1
     ORDER BY o.placed_at DESC, oi.id`,
    [req.params.id]);

  res.json({ product: prod.rows[0], buyers: rows });
}));

// ─── Combined purchase-record search ───
// GET /api/trace/records?customer=&product=&sku=&status=&from=&to=&format=csv
// Filters the flat purchase-record view (one row per order_item).
function buildRecordsQuery(qp) {
  const params = [];
  const where = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };

  if (qp.customer) {
    const l = p(`%${qp.customer}%`);
    where.push(`(u.name ILIKE ${l} OR u.email ILIKE ${l} OR u.phone ILIKE ${l})`);
  }
  if (qp.product) where.push(`oi.product_name ILIKE ${p(`%${qp.product}%`)}`);
  if (qp.sku) where.push(`oi.sku ILIKE ${p(`%${qp.sku}%`)}`);
  if (qp.status) where.push(`o.status = ${p(qp.status)}`);
  if (qp.from) where.push(`o.placed_at >= ${p(qp.from)}`);
  if (qp.to) where.push(`o.placed_at <= ${p(qp.to)}`);

  const sql = `
    SELECT o.id AS order_id, o.order_number, o.status AS order_status, o.placed_at,
           u.id AS customer_id, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
           oi.product_id, oi.product_name, oi.variant_name, oi.sku,
           oi.unit_price, oi.quantity, oi.line_total
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN users u ON u.id = o.user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY o.placed_at DESC, oi.id
    LIMIT 2000`;
  return { sql, params };
}

const CSV_COLS = [
  ['order_number', 'Order Number'], ['order_status', 'Order Status'], ['placed_at', 'Purchase Date'],
  ['customer_id', 'Customer ID'], ['customer_name', 'Customer'], ['customer_email', 'Email'],
  ['customer_phone', 'Phone'], ['product_name', 'Product'], ['variant_name', 'Variant'],
  ['sku', 'SKU'], ['unit_price', 'Price Paid'], ['quantity', 'Qty'], ['line_total', 'Line Total'],
];

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const cell = (key, r) => {
    if (key === 'placed_at' && r[key]) return esc(new Date(r[key]).toISOString());
    return esc(r[key]);
  };
  const header = CSV_COLS.map(([, label]) => esc(label)).join(',');
  const body = rows.map((r) => CSV_COLS.map(([key]) => cell(key, r)).join(',')).join('\n');
  return header + '\n' + body + '\n';
}

router.get('/records', asyncH(async (req, res) => {
  const { sql, params } = buildRecordsQuery(req.query);
  const { rows } = await query(sql, params);

  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="purchase-records.csv"');
    return res.send(toCsv(rows));
  }
  res.json({ records: rows, count: rows.length });
}));

export default router;
