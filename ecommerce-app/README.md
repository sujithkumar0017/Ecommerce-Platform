# ShopKart — E-Commerce App

Customer-facing storefront. Node/Express + PostgreSQL backend, React (Vite) frontend.
Runs the API on **port 3000** and the frontend dev server on **port 5173**.

Both this app and the Admin app share the **same PostgreSQL database** (`Ecommerce`).

## Prerequisites
- Node.js 18+
- PostgreSQL running locally, with the database named in `.env` already created

## Setup

```bash
# 1. Backend deps + DB
npm install
npm run db:migrate      # create tables  (use: node server/db/migrate.js --fresh  to reset schema)
npm run db:seed         # sample products, coupons, and an admin user

# 2. Frontend deps
cd client && npm install && cd ..
```

Configure credentials in `.env` (copied from `.env.example`):
`DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DATABASE_URL, JWT_SECRET`.

## Run (two terminals)

```bash
npm run dev             # API  -> http://localhost:3000
cd client && npm run dev # UI  -> http://localhost:5173
```

Open http://localhost:5173.

## Seeded logins
- **Admin** (used by the Admin app): `admin@shopkart.local` / `admin123`
- Customers: sign up in the UI.

## Coupons
- `WELCOME10` — 10% off (max ₹500)
- `FLAT200` — ₹200 off orders ≥ ₹1500
- `SAVE20` — 20% off orders ≥ ₹2000 (max ₹1000)

## Key design rule
Every purchase is recorded immutably: **user → order → order_items**, where each
`order_items` row snapshots `product_name`, `variant_name`, `sku`, and `unit_price`
(the price paid at that time). Product/price changes never alter past orders. There is
no direct user↔product link — traceability always goes through orders. This is exactly
what the Admin app relies on.

## API surface (all under `/api`)
- `auth` — signup, login, logout, me
- `profile` — view/edit
- `addresses` — CRUD + set default
- `products` — list (search/filter/sort), categories, detail (variants, images, reviews)
- `cart` — items CRUD, live totals, coupon apply/remove
- `orders` — place, pay (mock), history, detail, cancel, track
- `reviews` — eligibility, create, edit (delivered-only, 30-min edit window)
