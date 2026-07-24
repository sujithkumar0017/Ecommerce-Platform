# ShopKart — Admin App

Internal admin dashboard. Node/Express + PostgreSQL backend, React (Vite) frontend.
API on **port 4000**, frontend dev server on **port 5174**.

Connects to the **same PostgreSQL database** (`Ecommerce`) as the E-Commerce app —
that shared DB is what makes traceability possible. **No migration/seed here** — the
E-Commerce app owns the schema; this app only reads/writes the same tables.

## Prerequisites
- The E-Commerce app must already be set up (schema migrated + seeded), since it created
  the tables and the admin user.
- PostgreSQL running locally with the same credentials in this app's `.env`.

## Setup & run

```bash
npm install
cd client && npm install && cd ..

# two terminals:
npm run dev              # API -> http://localhost:4000
cd client && npm run dev # UI  -> http://localhost:5174
```

Open http://localhost:5174 and log in as **admin@shopkart.local / admin123**.
(Only `role = admin` users can log in — customer accounts are rejected.)

> Port note: if 5174 is busy, Vite auto-picks the next free port and prints it.

## Features
- **Products & inventory** — list/search, add/edit/archive products, add SKUs/variants,
  adjust stock per SKU (set value or +/- delta), activate/deactivate variants.
- **Orders** — view all orders (any customer), advance fulfillment
  `paid → packed → shipped → delivered` (shipping requires tracking info), cancel
  (with automatic restock). Illegal transitions are blocked.
- **Traceability (the core)**
  - **Customer → Purchases**: search a customer, see every product they ever bought
    (qty, price paid, order #, status, date).
  - **Product → Buyers**: search a product, see every customer who bought it.
  - **Combined Search + CSV**: filter purchase records by customer / product / SKU /
    status / date range and export to CSV.
  - All of it is traced **through orders/order_items** — never a direct user↔product link,
    so history stays accurate even after product changes.
- **Dashboard/Reports** — total revenue, orders, customers, active products,
  top-selling products, revenue by day, and repeat-customer rate.

## Design rule honored
The two traceability screens are two sides of the same coin: the same
user↔product link proven from both directions, always via the immutable
`order_items` snapshots (product name / variant / SKU / price paid).
