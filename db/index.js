const { Pool } = require('pg');

const hasConnectionString = Boolean(process.env.DATABASE_URL);
const shouldUseSsl = hasConnectionString && process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS merchants (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stores (
      id BIGSERIAL PRIMARY KEY,
      merchant_id BIGINT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
      shopify_id TEXT UNIQUE NOT NULL,
      domain TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS store_themes (
      id BIGSERIAL PRIMARY KEY,
      store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      shopify_id TEXT NOT NULL,
      name TEXT,
      version TEXT,
      preset TEXT,
      role TEXT,
      purchase_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (store_id, shopify_id)
    );
  `);
}

async function withTransaction(runInTransaction) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await runInTransaction(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  initDb,
  query,
  withTransaction,
};
