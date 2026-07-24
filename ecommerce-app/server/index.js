import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { load as loadYaml } from 'js-yaml';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from './config.js';
import { pool } from './db/pool.js';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import addressRoutes from './routes/addresses.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';

const app = express();

// In production, restrict CORS to the deployed frontend(s) listed in CLIENT_URL
// (comma-separated). In development (or if CLIENT_URL is unset) reflect any origin.
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const corsOptions =
  config.env === 'production' && allowedOrigins.length
    ? { origin: allowedOrigins, credentials: true }
    : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.use(express.json());

// ── API documentation (Swagger UI) ───────────────────────────────────────
// Mounted before the routers so it is never intercepted by auth middleware.
// Browse:  /api/docs      Raw spec:  /api/openapi.yaml
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const specPath = resolve(__dirname, '..', 'openapi.yaml');
  const rawSpec = readFileSync(specPath, 'utf8');
  const apiSpec = loadYaml(rawSpec);

  app.get('/api/openapi.yaml', (req, res) => {
    res.type('text/yaml').send(rawSpec);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(apiSpec, {
      customSiteTitle: 'ShopKart API — Docs',
      swaggerOptions: { persistAuthorization: true },
    })
  );
  console.log('API docs available at /api/docs');
} catch (err) {
  // Docs are non-essential — never let them stop the API from booting.
  console.warn('Swagger docs unavailable:', err.message);
}

// Health / DB check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'error', message: e.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', reviewRoutes); // reviews mounts its own sub-paths

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// Central error handler — sends friendly messages.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Something went wrong. Please try again.' });
});

app.listen(config.port, () => {
  console.log(`ShopKart E-Commerce API running on http://localhost:${config.port}`);
});
