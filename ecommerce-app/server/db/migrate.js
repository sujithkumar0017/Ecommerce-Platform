// Applies schema.sql to the configured database.
// Usage:
//   node server/db/migrate.js          -> create tables if not present
//   node server/db/migrate.js --fresh  -> DROP all app tables first, then recreate
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DROP_SQL = `
  DROP TABLE IF EXISTS reviews CASCADE;
  DROP TABLE IF EXISTS order_items CASCADE;
  DROP TABLE IF EXISTS orders CASCADE;
  DROP TABLE IF EXISTS coupons CASCADE;
  DROP TABLE IF EXISTS cart_items CASCADE;
  DROP TABLE IF EXISTS carts CASCADE;
  DROP TABLE IF EXISTS product_variants CASCADE;
  DROP TABLE IF EXISTS product_images CASCADE;
  DROP TABLE IF EXISTS products CASCADE;
  DROP TABLE IF EXISTS addresses CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
`;

async function main() {
  const fresh = process.argv.includes('--fresh');
  const schema = readFileSync(resolve(__dirname, 'schema.sql'), 'utf8');

  try {
    if (fresh) {
      console.log('Dropping existing tables (--fresh)...');
      await pool.query(DROP_SQL);
    }
    console.log('Applying schema...');
    await pool.query(schema);
    console.log('✓ Migration complete.');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
