const { query } = require('../db');

async function upsertStoreByShopifyId(
  { merchantId, shopifyId, domain },
  runner = { query },
) {
  const result = await runner.query(
    `
      INSERT INTO stores (merchant_id, shopify_id, domain)
      VALUES ($1, $2, $3)
      ON CONFLICT (shopify_id) DO UPDATE
      SET
        domain = EXCLUDED.domain
      WHERE stores.merchant_id = EXCLUDED.merchant_id
      RETURNING id, merchant_id, shopify_id, domain, created_at
    `,
    [merchantId, shopifyId, domain],
  );

  const store = result.rows[0] || null;

  if (!store) {
    throw new Error('Store belongs to a different merchant');
  }

  return store;
}

async function findStoreByShopifyId(shopifyId, runner = { query }) {
  if (!shopifyId) {
    return null;
  }

  const result = await runner.query(
    `
      SELECT id, merchant_id, shopify_id, domain, created_at
      FROM stores
      WHERE shopify_id = $1
      LIMIT 1
    `,
    [shopifyId],
  );

  return result.rows[0] || null;
}

module.exports = {
  findStoreByShopifyId,
  upsertStoreByShopifyId,
};
