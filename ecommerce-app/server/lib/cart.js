import { query } from '../db/pool.js';
import { computeTotals } from './pricing.js';

// Ensure the user has a cart row; return its id.
export async function getOrCreateCartId(userId, client = null) {
  const q = client ? client.query.bind(client) : query;
  const existing = await q('SELECT id FROM carts WHERE user_id = $1', [userId]);
  if (existing.rowCount) return existing.rows[0].id;
  const created = await q('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
  return created.rows[0].id;
}

// Load full cart items joined to variant + product info.
export async function getCartItems(cartId, client = null) {
  const q = client ? client.query.bind(client) : query;
  const { rows } = await q(
    `SELECT ci.id AS cart_item_id, ci.quantity, ci.variant_id,
            v.sku, v.variant_name, v.price AS unit_price, v.stock, v.is_active,
            p.id AS product_id, p.name AS product_name,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id
               ORDER BY pi.position, pi.id LIMIT 1) AS image
     FROM cart_items ci
     JOIN product_variants v ON v.id = ci.variant_id
     JOIN products p ON p.id = v.product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.added_at`,
    [cartId]
  );
  return rows;
}

// Build the full cart payload (items + totals) for a user, applying an optional coupon.
export async function buildCartResponse(userId, couponCode = null) {
  const cartId = await getOrCreateCartId(userId);
  const items = await getCartItems(cartId);

  let coupon = null;
  let couponError = null;
  if (couponCode) {
    const { rows } = await query('SELECT * FROM coupons WHERE UPPER(code) = UPPER($1)', [couponCode]);
    if (!rows[0]) couponError = 'Invalid coupon code.';
    else coupon = rows[0];
  }

  let totals;
  try {
    totals = computeTotals(items, coupon);
  } catch (e) {
    // Coupon invalid for this cart — surface message but still return totals without it.
    couponError = e.message;
    coupon = null;
    totals = computeTotals(items, null);
  }

  return {
    cart_id: cartId,
    items,
    coupon: coupon ? { code: coupon.code, description: coupon.description } : null,
    coupon_error: couponError,
    ...totals,
  };
}
