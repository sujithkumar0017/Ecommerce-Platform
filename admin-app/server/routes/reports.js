import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncH } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';

const router = Router();
router.use(requireAdmin);

// Revenue counts paid, non-cancelled orders.
const REVENUE_FILTER = `o.payment_status = 'paid' AND o.status <> 'cancelled'`;

// GET /api/reports/summary — headline numbers + the three required reports
router.get('/summary', asyncH(async (req, res) => {
  const [topProducts, revenueByDay, repeat, totals] = await Promise.all([
    // Top-selling products (by units sold in non-cancelled orders)
    query(
      `SELECT oi.product_id, oi.product_name,
              SUM(oi.quantity)::int AS units_sold,
              SUM(oi.line_total)::numeric(12,2) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'cancelled'
       GROUP BY oi.product_id, oi.product_name
       ORDER BY units_sold DESC
       LIMIT 10`),

    // Revenue by day (last 30 days with activity)
    query(
      `SELECT to_char(date_trunc('day', o.placed_at), 'YYYY-MM-DD') AS day,
              SUM(o.total)::numeric(12,2) AS revenue,
              COUNT(*)::int AS orders
       FROM orders o
       WHERE ${REVENUE_FILTER}
       GROUP BY day
       ORDER BY day DESC
       LIMIT 30`),

    // Repeat-customer rate
    query(
      `WITH per_customer AS (
         SELECT user_id, COUNT(*) AS n FROM orders WHERE status <> 'cancelled' GROUP BY user_id
       )
       SELECT
         COUNT(*)::int AS customers_with_orders,
         COUNT(*) FILTER (WHERE n >= 2)::int AS repeat_customers
       FROM per_customer`),

    // Headline totals
    query(
      `SELECT
         (SELECT COALESCE(SUM(total),0)::numeric(12,2) FROM orders o WHERE ${REVENUE_FILTER}) AS total_revenue,
         (SELECT COUNT(*)::int FROM orders) AS total_orders,
         (SELECT COUNT(*)::int FROM users WHERE role = 'customer') AS total_customers,
         (SELECT COUNT(*)::int FROM products WHERE is_archived = false) AS active_products`),
  ]);

  const rc = repeat.rows[0];
  const repeatRate = rc.customers_with_orders > 0
    ? Math.round((rc.repeat_customers / rc.customers_with_orders) * 1000) / 10
    : 0;

  res.json({
    totals: totals.rows[0],
    top_products: topProducts.rows,
    revenue_by_day: revenueByDay.rows.reverse(), // chronological for charts
    repeat_customers: {
      customers_with_orders: rc.customers_with_orders,
      repeat_customers: rc.repeat_customers,
      repeat_rate_pct: repeatRate,
    },
  });
}));

export default router;
