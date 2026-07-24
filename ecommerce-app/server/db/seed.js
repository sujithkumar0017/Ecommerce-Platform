// Seeds sample catalog data, coupons, and an admin user.
// Safe to re-run: clears catalog/coupon tables first (leaves customer accounts/orders intact).
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

// Real product photography (Unsplash CDN). First image is the card/primary shot.
const IMG = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=75`;
const PLACEHOLDER = (label) =>
  `https://placehold.co/600x600?text=${encodeURIComponent(label)}`;

const products = [
  {
    name: 'Classic Cotton T-Shirt', category: 'Apparel', brand: 'UrbanThread',
    description: 'Soft 100% combed cotton crew-neck tee. Everyday comfort.',
    base_price: 499,
    images: [IMG('1521572163474-6864f9cf17ab'), IMG('1562157873-818bc0726f68')],
    variants: [
      { variant_name: 'S / Black', attributes: { size: 'S', color: 'Black' }, price: 499, stock: 40 },
      { variant_name: 'M / Black', attributes: { size: 'M', color: 'Black' }, price: 499, stock: 55 },
      { variant_name: 'L / Navy', attributes: { size: 'L', color: 'Navy' }, price: 549, stock: 30 },
    ],
  },
  {
    name: 'Running Shoes Pro', category: 'Footwear', brand: 'Strider',
    description: 'Lightweight cushioned running shoes with breathable mesh.',
    base_price: 2999,
    images: [IMG('1542291026-7eec264c27ff'), IMG('1595950653106-6c9ebd614d3a')],
    variants: [
      { variant_name: 'UK 8 / Grey', attributes: { size: 'UK 8', color: 'Grey' }, price: 2999, stock: 25 },
      { variant_name: 'UK 9 / Grey', attributes: { size: 'UK 9', color: 'Grey' }, price: 2999, stock: 18 },
      { variant_name: 'UK 10 / Blue', attributes: { size: 'UK 10', color: 'Blue' }, price: 3199, stock: 12 },
    ],
  },
  {
    name: 'Wireless Headphones', category: 'Electronics', brand: 'SonicWave',
    description: 'Over-ear Bluetooth headphones with 30-hour battery and ANC.',
    base_price: 4499,
    images: [IMG('1505740420928-5e560c06d30e'), IMG('1618366712010-f4ae9c647dcb')],
    variants: [
      { variant_name: 'Black', attributes: { color: 'Black' }, price: 4499, stock: 20 },
      { variant_name: 'White', attributes: { color: 'White' }, price: 4499, stock: 15 },
    ],
  },
  {
    name: 'Stainless Steel Water Bottle', category: 'Home & Kitchen', brand: 'HydroPeak',
    description: 'Insulated 750ml bottle keeps drinks cold 24h / hot 12h.',
    base_price: 799,
    images: [IMG('1602143407151-7111542de6e8'), IMG('1523362628745-0c100150b504')],
    variants: [
      { variant_name: '750ml / Steel', attributes: { size: '750ml', color: 'Steel' }, price: 799, stock: 60 },
      { variant_name: '750ml / Teal', attributes: { size: '750ml', color: 'Teal' }, price: 849, stock: 35 },
    ],
  },
  {
    name: 'Mechanical Keyboard', category: 'Electronics', brand: 'KeyForge',
    description: 'Hot-swappable 87-key mechanical keyboard with RGB backlight.',
    base_price: 5999,
    images: [IMG('1587829741301-dc798b83add3'), IMG('1618384887929-16ec33fab9ef')],
    variants: [
      { variant_name: 'Brown Switch', attributes: { switch: 'Brown' }, price: 5999, stock: 14 },
      { variant_name: 'Red Switch', attributes: { switch: 'Red' }, price: 5999, stock: 9 },
    ],
  },
  {
    name: 'Leather Wallet', category: 'Accessories', brand: 'Craftsman',
    description: 'Genuine leather bifold wallet with RFID protection.',
    base_price: 1299,
    images: [IMG('1627123424574-724758594e93'), IMG('1503341504253-dff4815485f1')],
    variants: [
      { variant_name: 'Brown', attributes: { color: 'Brown' }, price: 1299, stock: 45 },
      { variant_name: 'Black', attributes: { color: 'Black' }, price: 1299, stock: 50 },
    ],
  },
  {
    name: 'Yoga Mat', category: 'Sports & Fitness', brand: 'ZenFlex',
    description: 'Non-slip 6mm TPE yoga mat with carrying strap.',
    base_price: 999,
    images: [IMG('1592432678016-e910b452f9a2'), IMG('1601925260368-ae2f83cf8b7f')],
    variants: [
      { variant_name: 'Purple', attributes: { color: 'Purple' }, price: 999, stock: 28 },
      { variant_name: 'Green', attributes: { color: 'Green' }, price: 999, stock: 0 }, // out of stock demo
    ],
  },
  {
    name: 'Ceramic Coffee Mug Set', category: 'Home & Kitchen', brand: 'Hearth',
    description: 'Set of 4 microwave-safe 350ml ceramic mugs.',
    base_price: 899,
    images: [IMG('1514228742587-6b1558fcca3d'), IMG('1481833761820-0509d3217039')],
    variants: [
      { variant_name: 'Assorted', attributes: { pack: '4' }, price: 899, stock: 33 },
    ],
  },
];

const coupons = [
  { code: 'WELCOME10', description: '10% off your order', discount_type: 'percent', discount_value: 10, min_subtotal: 0, max_discount: 500 },
  { code: 'FLAT200', description: '₹200 off orders above ₹1500', discount_type: 'fixed', discount_value: 200, min_subtotal: 1500, max_discount: null },
  { code: 'SAVE20', description: '20% off orders above ₹2000', discount_type: 'percent', discount_value: 20, min_subtotal: 2000, max_discount: 1000 },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear catalog + coupons (keep users/orders).
    await client.query('DELETE FROM product_images');
    await client.query('DELETE FROM product_variants');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM coupons');

    let skuCounter = 1000;
    for (const prod of products) {
      const slug = prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { rows } = await client.query(
        `INSERT INTO products (name, slug, description, category, brand, base_price)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [prod.name, slug, prod.description, prod.category, prod.brand, prod.base_price]);
      const productId = rows[0].id;

      const imgs = prod.images?.length ? prod.images : [PLACEHOLDER(prod.name)];
      for (let i = 0; i < imgs.length; i++) {
        await client.query(
          'INSERT INTO product_images (product_id, url, position) VALUES ($1,$2,$3)',
          [productId, imgs[i], i]);
      }

      for (const v of prod.variants) {
        skuCounter += 1;
        await client.query(
          `INSERT INTO product_variants (product_id, sku, variant_name, attributes, price, stock)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [productId, `SKU-${skuCounter}`, v.variant_name, JSON.stringify(v.attributes), v.price, v.stock]);
      }
    }

    for (const c of coupons) {
      await client.query(
        `INSERT INTO coupons (code, description, discount_type, discount_value, min_subtotal, max_discount)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [c.code, c.description, c.discount_type, c.discount_value, c.min_subtotal, c.max_discount]);
    }

    // Admin user (idempotent) — used by the Admin app.
    const adminHash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ('Store Admin', 'admin@shopkart.local', '9999999999', $1, 'admin')
       ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash`,
      [adminHash]);

    await client.query('COMMIT');
    console.log('✓ Seed complete.');
    console.log(`  Products: ${products.length}, Coupons: ${coupons.length}`);
    console.log('  Admin login → admin@shopkart.local / admin123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
