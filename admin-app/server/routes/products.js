import { Router } from 'express';
import { query, withTransaction } from '../db/pool.js';
import { asyncH, badRequest, notFound } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';

const router = Router();
router.use(requireAdmin);

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// GET /api/products?include_archived=true&q=&category=
router.get('/', asyncH(async (req, res) => {
  const { q, category, include_archived } = req.query;
  const params = [];
  const where = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };

  if (include_archived !== 'true') where.push('p.is_archived = false');
  if (q) { const l = p(`%${q}%`); where.push(`(p.name ILIKE ${l} OR p.brand ILIKE ${l})`); }
  if (category) where.push(`p.category = ${p(category)}`);

  const sql = `
    SELECT p.id, p.name, p.category, p.brand, p.base_price, p.is_archived, p.created_at,
           COUNT(v.id)::int AS variant_count,
           COALESCE(SUM(v.stock), 0)::int AS total_stock
    FROM products p
    LEFT JOIN product_variants v ON v.product_id = p.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    GROUP BY p.id
    ORDER BY p.created_at DESC`;
  const { rows } = await query(sql, params);
  res.json({ products: rows });
}));

// GET /api/products/categories
router.get('/categories', asyncH(async (req, res) => {
  const { rows } = await query('SELECT DISTINCT category FROM products ORDER BY category');
  res.json({ categories: rows.map((r) => r.category) });
}));

// GET /api/products/:id — full detail with variants
router.get('/:id', asyncH(async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  const product = rows[0];
  if (!product) throw notFound('Product not found.');
  const variants = await query(
    'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id', [product.id]);
  const images = await query(
    'SELECT * FROM product_images WHERE product_id = $1 ORDER BY position, id', [product.id]);
  res.json({ product: { ...product, variants: variants.rows, images: images.rows } });
}));

// POST /api/products — create product (+ optional variants)
router.post('/', asyncH(async (req, res) => {
  const { name, description, category, brand, base_price, image_url, variants } = req.body || {};
  if (!name || !category) throw badRequest('Name and category are required.');

  const product = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO products (name, slug, description, category, brand, base_price)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, slugify(name) + '-' + Date.now().toString().slice(-5), description || null,
       category, brand || null, base_price || 0]);
    const prod = rows[0];

    if (image_url) {
      await client.query('INSERT INTO product_images (product_id, url, position) VALUES ($1,$2,0)',
        [prod.id, image_url]);
    }
    for (const v of variants || []) {
      if (!v.sku || v.price == null) continue;
      await client.query(
        `INSERT INTO product_variants (product_id, sku, variant_name, attributes, price, stock)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [prod.id, v.sku, v.variant_name || 'Default', JSON.stringify(v.attributes || {}),
         v.price, v.stock || 0]);
    }
    return prod;
  });
  res.status(201).json({ product });
}));

// PUT /api/products/:id — edit product fields
router.put('/:id', asyncH(async (req, res) => {
  const { name, description, category, brand, base_price } = req.body || {};
  if (!name || !category) throw badRequest('Name and category are required.');
  const { rows } = await query(
    `UPDATE products SET name=$1, description=$2, category=$3, brand=$4, base_price=$5
     WHERE id=$6 RETURNING *`,
    [name, description || null, category, brand || null, base_price || 0, req.params.id]);
  if (!rows[0]) throw notFound('Product not found.');
  res.json({ product: rows[0] });
}));

// PATCH /api/products/:id/archive  { archived: true|false }
router.patch('/:id/archive', asyncH(async (req, res) => {
  const archived = !!req.body?.archived;
  const { rows } = await query(
    'UPDATE products SET is_archived=$1 WHERE id=$2 RETURNING id, name, is_archived',
    [archived, req.params.id]);
  if (!rows[0]) throw notFound('Product not found.');
  res.json({ product: rows[0] });
}));

// ─── Variants ───
// POST /api/products/:id/variants — add a variant/SKU
router.post('/:id/variants', asyncH(async (req, res) => {
  const { sku, variant_name, attributes, price, stock } = req.body || {};
  if (!sku || price == null) throw badRequest('SKU and price are required.');
  const prod = await query('SELECT id FROM products WHERE id = $1', [req.params.id]);
  if (!prod.rowCount) throw notFound('Product not found.');
  try {
    const { rows } = await query(
      `INSERT INTO product_variants (product_id, sku, variant_name, attributes, price, stock)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, sku, variant_name || 'Default', JSON.stringify(attributes || {}),
       price, stock || 0]);
    res.status(201).json({ variant: rows[0] });
  } catch (e) {
    if (e.code === '23505') throw badRequest('That SKU already exists.');
    throw e;
  }
}));

// PUT /api/variants/:variantId — edit variant (price/name/active)
router.put('/variants/:variantId', asyncH(async (req, res) => {
  const { variant_name, price, is_active } = req.body || {};
  const { rows } = await query(
    `UPDATE product_variants
     SET variant_name = COALESCE($1, variant_name),
         price = COALESCE($2, price),
         is_active = COALESCE($3, is_active)
     WHERE id = $4 RETURNING *`,
    [variant_name ?? null, price ?? null, is_active ?? null, req.params.variantId]);
  if (!rows[0]) throw notFound('Variant not found.');
  res.json({ variant: rows[0] });
}));

// PATCH /api/variants/:variantId/stock  { stock } or { delta }
router.patch('/variants/:variantId/stock', asyncH(async (req, res) => {
  const { stock, delta } = req.body || {};
  let sql, val;
  if (delta != null) { sql = 'UPDATE product_variants SET stock = GREATEST(stock + $1, 0) WHERE id = $2 RETURNING *'; val = Number(delta); }
  else if (stock != null) { sql = 'UPDATE product_variants SET stock = $1 WHERE id = $2 RETURNING *'; val = Math.max(0, Number(stock)); }
  else throw badRequest('Provide a new stock value or a delta.');

  const { rows } = await query(sql, [val, req.params.variantId]);
  if (!rows[0]) throw notFound('Variant not found.');
  res.json({ variant: rows[0] });
}));

export default router;
