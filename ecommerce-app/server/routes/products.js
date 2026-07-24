import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncH, notFound } from '../lib/http.js';

const router = Router();

// Shared SELECT that decorates a product with price range, rating, stock & primary image.
// price/stock are derived from active variants; rating from reviews.
const PRODUCT_LIST_SQL = `
  SELECT p.id, p.name, p.slug, p.category, p.brand, p.description, p.is_archived, p.created_at,
         COALESCE(MIN(v.price), p.base_price)        AS min_price,
         COALESCE(MAX(v.price), p.base_price)        AS max_price,
         COALESCE(SUM(v.stock), 0)                   AS total_stock,
         COALESCE(AVG(r.rating), 0)::numeric(3,2)    AS avg_rating,
         COUNT(DISTINCT r.id)                         AS review_count,
         (SELECT url FROM product_images pi WHERE pi.product_id = p.id
            ORDER BY pi.position ASC, pi.id ASC LIMIT 1) AS image
  FROM products p
  LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_active = true
  LEFT JOIN reviews r ON r.product_id = p.id
  WHERE p.is_archived = false
`;

// GET /api/products  — browse/search/filter/sort
// query params: q, category, min_price, max_price, min_rating, in_stock,
//               sort (price_asc|price_desc|newest|rating), page, limit
router.get('/', asyncH(async (req, res) => {
  const {
    q, category, min_price, max_price, min_rating, in_stock, sort,
    page = '1', limit = '24',
  } = req.query;

  const params = [];
  const where = [];
  const having = [];
  const p = (val) => { params.push(val); return `$${params.length}`; };

  if (q) {
    const like = p(`%${q}%`);
    where.push(`(p.name ILIKE ${like} OR p.description ILIKE ${like} OR p.brand ILIKE ${like})`);
  }
  if (category) where.push(`p.category = ${p(category)}`);

  // HAVING-level filters (operate on aggregates of variants/reviews)
  if (min_price) having.push(`COALESCE(MIN(v.price), p.base_price) >= ${p(Number(min_price))}`);
  if (max_price) having.push(`COALESCE(MIN(v.price), p.base_price) <= ${p(Number(max_price))}`);
  if (min_rating) having.push(`COALESCE(AVG(r.rating), 0) >= ${p(Number(min_rating))}`);
  if (in_stock === 'true') having.push('COALESCE(SUM(v.stock), 0) > 0');

  const sortMap = {
    price_asc: 'min_price ASC',
    price_desc: 'min_price DESC',
    newest: 'p.created_at DESC',
    rating: 'avg_rating DESC',
  };
  const orderBy = sortMap[sort] || 'p.created_at DESC';

  const lim = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100);
  const off = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;

  let sql = PRODUCT_LIST_SQL;
  if (where.length) sql += ' AND ' + where.join(' AND ');
  sql += ' GROUP BY p.id';
  if (having.length) sql += ' HAVING ' + having.join(' AND ');
  sql += ` ORDER BY ${orderBy}`;
  sql += ` LIMIT ${p(lim)} OFFSET ${p(off)}`;

  const { rows } = await query(sql, params);
  res.json({ products: rows, page: parseInt(page, 10) || 1, limit: lim });
}));

// GET /api/products/categories — distinct category list with counts
router.get('/categories', asyncH(async (req, res) => {
  const { rows } = await query(
    `SELECT category, COUNT(*)::int AS count
     FROM products WHERE is_archived = false
     GROUP BY category ORDER BY category`
  );
  res.json({ categories: rows });
}));

// GET /api/products/:idOrSlug — detail with images, variants, reviews
router.get('/:idOrSlug', asyncH(async (req, res) => {
  const key = req.params.idOrSlug;
  const byId = /^\d+$/.test(key);
  const { rows } = await query(
    `SELECT * FROM products WHERE is_archived = false AND ${byId ? 'id = $1' : 'slug = $1'}`,
    [byId ? Number(key) : key]
  );
  const product = rows[0];
  if (!product) throw notFound('Product not found.');

  const [images, variants, reviews, agg] = await Promise.all([
    query('SELECT id, url, position FROM product_images WHERE product_id = $1 ORDER BY position, id',
      [product.id]),
    query(`SELECT id, sku, variant_name, attributes, price, stock, is_active
           FROM product_variants WHERE product_id = $1 AND is_active = true ORDER BY id`, [product.id]),
    query(`SELECT r.id, r.rating, r.title, r.body, r.created_at, r.updated_at, u.name AS author
           FROM reviews r JOIN users u ON u.id = r.user_id
           WHERE r.product_id = $1 ORDER BY r.created_at DESC`, [product.id]),
    query(`SELECT COALESCE(AVG(rating),0)::numeric(3,2) AS avg_rating, COUNT(*)::int AS review_count
           FROM reviews WHERE product_id = $1`, [product.id]),
  ]);

  res.json({
    product: {
      ...product,
      images: images.rows,
      variants: variants.rows,
      reviews: reviews.rows,
      avg_rating: agg.rows[0].avg_rating,
      review_count: agg.rows[0].review_count,
    },
  });
}));

export default router;
