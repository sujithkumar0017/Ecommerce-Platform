# 🚀 Deploying ShopKart (free) — Netlify frontends + Render backends

Netlify can't run Express servers or PostgreSQL, so this project splits across
two free platforms:

| Piece | Platform | Source folder |
|---|---|---|
| Storefront SPA | **Netlify** | `ecommerce-app/client` |
| Admin SPA | **Netlify** | `admin-app/client` |
| Ecommerce API | **Render** (Web Service) | `ecommerce-app` |
| Admin API | **Render** (Web Service) | `admin-app` |
| PostgreSQL (shared) | **Render** | — |

Both APIs talk to the **same** Render Postgres. The frontends call the APIs over
HTTPS (baked in via `VITE_API_URL`); the APIs allow those origins via CORS
(`CLIENT_URL`).

> **Free-tier expectations (fine for a sub-month internal test):**
> - Render APIs **sleep after ~15 min idle**; the next request wakes them (~30–50s).
> - Render's free Postgres is **deleted after 30 days**.

---

## ✅ Already done for you
- `render.yaml` — provisions the DB + both APIs (with SSL, health checks, CORS).
- `netlify.toml` in each client folder — build command, `dist` publish, SPA
  redirects, and the `VITE_API_URL` pointing at the Render APIs.
- Production DB SSL + CORS hardening in the server code.
- Everything committed and pushed to `github.com/sujithkumar0017/Ecommerce-Platform` (`main`).

You do: **(1) deploy backends on Render → (2) deploy the two frontends on Netlify
→ (3) reconcile the URLs.**

---

## Part 1 — Backends + database on Render

1. Sign in at **https://dashboard.render.com** ("Sign in with GitHub").
2. **New ➜ Blueprint** ➜ select **`Ecommerce-Platform`** ➜ **Apply**.
   Render creates `shopkart-db`, `shopkart-ecommerce-api`, `shopkart-admin-api`.
   The APIs' build step runs `npm run db:migrate`, creating all tables.
3. When the APIs are live, note their URLs (Dashboard → each service), e.g.:
   - `https://shopkart-ecommerce-api.onrender.com`
   - `https://shopkart-admin-api.onrender.com`
4. Health-check each: open `https://<api-url>/api/health` → `{"ok":true,"db":"connected"}`.
5. **Seed the database once** — `shopkart-ecommerce-api` → **Shell** tab:
   ```bash
   npm run db:seed
   ```
   This creates the admin login (see `ecommerce-app/server/db/seed.js`) and demo catalog.

---

## Part 2 — Frontends on Netlify (two sites, same repo)

Do this **twice** — once per frontend.

### Storefront site
1. Sign in at **https://app.netlify.com** ("Sign in with GitHub").
2. **Add new site ➜ Import an existing project ➜ GitHub ➜ `Ecommerce-Platform`**.
3. Configure:
   - **Base directory:** `ecommerce-app/client`
   - Build command / publish dir are read from its `netlify.toml`
     (`npm run build` → `dist`). Leave them as detected.
4. **Deploy**. Note the URL, e.g. `https://<something>.netlify.app`.
5. (Optional) **Site settings ➜ Change site name** → `shopkart-ecommerce`
   so the URL becomes `https://shopkart-ecommerce.netlify.app`.

### Admin site
Repeat with **Base directory:** `admin-app/client`, and name it `shopkart-admin`.

> `VITE_API_URL` is already set in each `netlify.toml`. If your Render API URLs
> differ from the predicted ones, override it in **Netlify → Site settings →
> Environment variables**, then **Trigger deploy ➜ Clear cache and deploy**
> (Vite bakes the value in at build time).

---

## Part 3 — Reconcile the URLs (2-minute check)

The two platforms cross-reference each other, so make the four values line up:

| Value | Where to set | Should equal |
|---|---|---|
| `VITE_API_URL` (storefront) | Netlify storefront site (or its `netlify.toml`) | `https://<ecommerce-api>.onrender.com/api` |
| `VITE_API_URL` (admin) | Netlify admin site (or its `netlify.toml`) | `https://<admin-api>.onrender.com/api` |
| `CLIENT_URL` (ecommerce-api) | Render ecommerce-api → Environment | `https://<storefront>.netlify.app` |
| `CLIENT_URL` (admin-api) | Render admin-api → Environment | `https://<admin>.netlify.app` |

- Changed a Render `CLIENT_URL`? The API restarts automatically.
- Changed a Netlify `VITE_API_URL`? **Clear cache and deploy** the site to rebuild.
- `CLIENT_URL` must match the Netlify URL **exactly**, with no trailing slash.

Then open your sites:
- **Storefront:** `https://shopkart-ecommerce.netlify.app`
- **Admin:** `https://shopkart-admin.netlify.app`

---

## Redeploys
Every `git push` to `main` auto-redeploys the affected Render services **and**
Netlify sites. No manual steps (unless you change a `VITE_API_URL`, which needs a
Netlify rebuild).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Browser console shows a CORS error | `CLIENT_URL` on the API must exactly equal the Netlify site URL (no trailing slash). |
| Frontend loads but API calls 404 / fail | `VITE_API_URL` wrong → fix it and **Clear cache and deploy** on Netlify. |
| Refreshing a deep link 404s on Netlify | SPA redirect (already in `netlify.toml`) — confirm Base directory is set to the client folder so Netlify reads it. |
| API `/api/health` shows `db: error` | DB still starting, or `DATABASE_URL` not linked — check the API's Environment tab on Render. |
| First request very slow | Render free service woke from sleep — expected. |
| Netlify build can't find package.json | Base directory must be `ecommerce-app/client` / `admin-app/client`, not the repo root. |
