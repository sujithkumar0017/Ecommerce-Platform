-- ShopKart shared schema (used by both ecommerce-app and admin-app)
-- Core design rule: a purchase is recorded immutably as
--   user -> order -> order_items (product + variant + qty + price paid AT THAT TIME).
-- order_items snapshot product/variant/sku/price so history survives later changes.

-- ─────────────────────────────  USERS & ADDRESSES  ─────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label          TEXT,
  recipient_name TEXT NOT NULL,
  phone          TEXT NOT NULL,
  line1          TEXT NOT NULL,
  line2          TEXT,
  city           TEXT NOT NULL,
  state          TEXT NOT NULL,
  postal_code    TEXT NOT NULL,
  country        TEXT NOT NULL DEFAULT 'India',
  is_default     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

-- ─────────────────────────────  PRODUCTS  ─────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  description TEXT,
  category    TEXT NOT NULL,
  brand       TEXT,
  base_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE TABLE IF NOT EXISTS product_images (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- A variant is a purchasable SKU (e.g. "Size: M / Color: Red").
CREATE TABLE IF NOT EXISTS product_variants (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku          TEXT NOT NULL UNIQUE,
  variant_name TEXT NOT NULL DEFAULT 'Default',
  attributes   JSONB NOT NULL DEFAULT '{}'::jsonb,
  price        NUMERIC(10,2) NOT NULL,
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active    BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- ─────────────────────────────  CART  ─────────────────────────────
CREATE TABLE IF NOT EXISTS carts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  cart_id    INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

-- ─────────────────────────────  COUPONS  ─────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id             SERIAL PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  description    TEXT,
  discount_type  TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_subtotal   NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount   NUMERIC(10,2),           -- cap for percent coupons (nullable)
  is_active      BOOLEAN NOT NULL DEFAULT true,
  expires_at     TIMESTAMPTZ
);

-- ─────────────────────────────  ORDERS  ─────────────────────────────
-- Delivery address is SNAPSHOTTED onto the order so it never changes retroactively.
CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  order_number   TEXT NOT NULL UNIQUE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status         TEXT NOT NULL DEFAULT 'placed'
                 CHECK (status IN ('placed','paid','packed','shipped','delivered','cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
                 CHECK (payment_status IN ('unpaid','paid')),

  subtotal       NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax            NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_fee   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total          NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code    TEXT,

  -- address snapshot
  ship_recipient TEXT,
  ship_phone     TEXT,
  ship_line1     TEXT,
  ship_line2     TEXT,
  ship_city      TEXT,
  ship_state     TEXT,
  ship_postal    TEXT,
  ship_country   TEXT,

  -- tracking
  tracking_carrier TEXT,
  tracking_number  TEXT,

  placed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at      TIMESTAMPTZ,
  packed_at    TIMESTAMPTZ,
  shipped_at   TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Immutable purchase record. Snapshots ensure the line never changes even if the
-- product/variant is later renamed, repriced, or archived.
CREATE TABLE IF NOT EXISTS order_items (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
  variant_id    INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,        -- snapshot
  variant_name  TEXT NOT NULL,        -- snapshot
  sku           TEXT NOT NULL,        -- snapshot
  unit_price    NUMERIC(10,2) NOT NULL, -- price paid AT THAT TIME (snapshot)
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  line_total    NUMERIC(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ─────────────────────────────  REVIEWS  ─────────────────────────────
-- A review is tied to the order_item that entitles it (proves delivery).
CREATE TABLE IF NOT EXISTS reviews (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_item_id INTEGER REFERENCES order_items(id) ON DELETE SET NULL,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  edit_deadline TIMESTAMPTZ NOT NULL,
  UNIQUE (product_id, user_id)   -- one review per product per user
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
