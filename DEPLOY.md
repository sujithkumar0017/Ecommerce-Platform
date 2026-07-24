# 🚀 Deploying ShopKart (free tier, Render)

This monorepo deploys as **5 services** from a single [`render.yaml`](render.yaml)
blueprint — two APIs, two React SPAs, and one shared PostgreSQL database:

| Service | Type | Source folder |
|---|---|---|
| `shopkart-db` | PostgreSQL (free) | — |
| `shopkart-ecommerce-api` | Node Web Service | `ecommerce-app` |
| `shopkart-admin-api` | Node Web Service | `admin-app` |
| `shopkart-ecommerce-web` | Static Site (SPA) | `ecommerce-app/client` |
| `shopkart-admin-web` | Static Site (SPA) | `admin-app/client` |

Both APIs connect to the **same** `shopkart-db`, exactly like local dev.

> **Free-tier expectations (fine for internal testing):**
> - APIs **sleep after ~15 min idle**; the next request wakes them (~30–50s cold start).
> - Render's **free Postgres is deleted after 30 days**. For a permanent free DB, see
>   [Option B: Neon](#option-b-permanent-free-database-neon) below.

---

## ✅ What's already done for you
- Production **DB SSL** wired into both backends (`DB_SSL=true`).
- **CORS** locked to the deployed frontends in production.
- `render.yaml` blueprint with all env vars, health checks and SPA routing.
- Root `.gitignore` (your `.env` secrets are **never** committed).
- Everything committed on branch `main`.

You only need to: **push to GitHub → create the Blueprint → seed the DB once.**

---

## 1. Push the monorepo to GitHub

Create a **new empty repo** on GitHub (e.g. `shopkart`) — no README/gitignore.
Then, from `d:\E-Commerce`:

```powershell
git remote add origin https://github.com/<your-username>/shopkart.git
git push -u origin main
```

> Your existing `Ecommerce-Platform` repo is unaffected. If you'd rather reuse it,
> point `origin` at that URL instead and `git push -u origin main --force`
> (this replaces its contents with the monorepo layout).

---

## 2. Create the Render Blueprint

1. Sign in at **https://dashboard.render.com** (free account, "Sign in with GitHub").
2. **New ➜ Blueprint**.
3. Connect/select your `shopkart` repo. Render auto-detects `render.yaml`.
4. Review the 5 resources it will create, then **Apply**.

Render now builds and deploys everything. The database comes up first, then the
APIs (their build runs `npm run db:migrate`, creating all tables), then the SPAs.

---

## 3. Verify the URLs (important — 2-minute check)

`render.yaml` pre-fills the four public URLs assuming these names are free:

| Env var | Set on | Expected value |
|---|---|---|
| `VITE_API_URL` | ecommerce-web | `https://shopkart-ecommerce-api.onrender.com/api` |
| `VITE_API_URL` | admin-web | `https://shopkart-admin-api.onrender.com/api` |
| `CLIENT_URL` | ecommerce-api | `https://shopkart-ecommerce-web.onrender.com` |
| `CLIENT_URL` | admin-api | `https://shopkart-admin-web.onrender.com` |
| `ECOMMERCE_APP_URL` | admin-api | `https://shopkart-ecommerce-web.onrender.com` |

**If Render appended a random suffix** to any service name (because the name was
taken globally), open that service → **Settings**, copy its real URL, and fix the
env vars above to match. Then:
- Changed a `CLIENT_URL` / `ECOMMERCE_APP_URL`? The API restarts automatically.
- Changed a `VITE_API_URL`? The SPA must be **rebuilt** — click **Manual Deploy ➜
  Deploy latest commit** on that Static Site (Vite bakes the URL in at build time).

Check each API is alive: open `https://<api-url>/api/health` → should return
`{"ok":true,"db":"connected"}`.

---

## 4. Seed the database once

Tables are created automatically by the migrate step. To load the sample catalog,
coupons and the **admin login**, run the seed once:

1. Open **shopkart-ecommerce-api** → **Shell** tab.
2. Run:
   ```bash
   npm run db:seed
   ```

This creates the admin account (see `ecommerce-app/server/db/seed.js`) and demo
products. It's safe to re-run; it refreshes the catalog but keeps customer
accounts and orders.

> Prefer a clean slate later? `npm run db:reset` (⚠️ drops & recreates all tables).

---

## 5. Use your deployed apps

- **Storefront:** `https://shopkart-ecommerce-web.onrender.com`
- **Admin dashboard:** `https://shopkart-admin-web.onrender.com`

Sign up as a customer on the storefront; log into the admin app with the seeded
admin credentials.

---

## Option B: Permanent free database (Neon)

Render's free Postgres expires after 30 days. For a database that stays free
indefinitely:

1. Create a free project at **https://neon.tech** and copy its
   **connection string** (`postgresql://…?sslmode=require`).
2. In `render.yaml`, **delete the `databases:` block**, and on **both** API
   services replace the `DATABASE_URL` entry:
   ```yaml
   - key: DATABASE_URL
     sync: false        # set the value in the dashboard, don't store in git
   ```
   Commit & push, then paste the Neon connection string into each API's
   **Environment** tab. `DB_SSL=true` is already set, so TLS just works.
3. Re-run the seed (step 4) against the new database.

---

## Redeploys

Every `git push` to `main` triggers Render to rebuild and redeploy the affected
services automatically. No further steps needed.

## Troubleshooting

| Symptom | Fix |
|---|---|
| SPA calls fail with CORS error | `CLIENT_URL` on the API must exactly equal the SPA's URL (no trailing slash). |
| SPA can't reach API / 404s | `VITE_API_URL` wrong → fix it and **Manual Deploy** the Static Site to rebuild. |
| API logs `no pg_hba.conf entry` / SSL error | Ensure `DB_SSL=true` is set on the API (it is, by default). |
| `/api/health` shows `db: error` | DB still starting, or `DATABASE_URL` not linked — check the API's Environment tab. |
| Refreshing a deep link 404s | SPA rewrite rule (already in `render.yaml`) — confirm the Static Site has the `/* → /index.html` rewrite. |
| First request very slow | Free service woke from sleep — expected. |
