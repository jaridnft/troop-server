const { query } = require('../db');

async function upsertMerchantByEmail({ email }, runner = { query }) {
  const result = await runner.query(
    `
      INSERT INTO merchants (email)
      VALUES ($1)
      ON CONFLICT (email) DO UPDATE
      SET email = EXCLUDED.email
      RETURNING id, email, created_at
    `,
    [email],
  );

  return result.rows[0] || null;
}

async function findMerchantByEmail(email, runner = { query }) {
  if (!email) {
    return null;
  }

  const result = await runner.query(
    `
      SELECT id, email, created_at
      FROM merchants
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0] || null;
}

module.exports = {
  findMerchantByEmail,
  upsertMerchantByEmail,
};
