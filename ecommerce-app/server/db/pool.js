import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

// Managed Postgres providers (Render, Neon, Railway, Supabase…) require TLS.
// Enable it via DB_SSL=true, or automatically in production when a connection
// string is used. Local development stays unencrypted.
const useSSL =
  process.env.DB_SSL === 'true' ||
  (process.env.NODE_ENV === 'production' && !!config.db.connectionString);
const ssl = useSSL ? { ssl: { rejectUnauthorized: false } } : {};

// Prefer DATABASE_URL when present, otherwise fall back to discrete fields.
export const pool = config.db.connectionString
  ? new Pool({ connectionString: config.db.connectionString, ...ssl })
  : new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ...ssl,
    });

export const query = (text, params) => pool.query(text, params);

// Run a set of statements inside a single transaction.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
