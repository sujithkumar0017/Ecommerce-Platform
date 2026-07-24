import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pool } from './db/pool.js';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import traceRoutes from './routes/traceability.js';
import reportRoutes from './routes/reports.js';

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

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected', app: 'admin' });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'error', message: e.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/trace', traceRoutes);
app.use('/api/reports', reportRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Something went wrong.' });
});

app.listen(config.port, () => {
  console.log(`ShopKart Admin API running on http://localhost:${config.port}`);
});
