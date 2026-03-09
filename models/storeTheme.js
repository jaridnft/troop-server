const { query } = require('../db');

async function upsertStoreTheme(
  { storeDbId, shopifyId, name, version, preset, role, purchaseDate },
  runner = { query },
) {
  const result = await runner.query(
    `
      INSERT INTO store_themes (store_id, shopify_id, name, version, preset, role, purchase_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (store_id, shopify_id) DO UPDATE
      SET
        name = EXCLUDED.name,
        version = EXCLUDED.version,
        preset = EXCLUDED.preset,
        role = EXCLUDED.role,
        purchase_date = COALESCE(store_themes.purchase_date, EXCLUDED.purchase_date)
      RETURNING id, store_id, shopify_id, name, version, preset, role, purchase_date, created_at
    `,
    [storeDbId, shopifyId, name, version, preset, role, purchaseDate],
  );

  return result.rows[0] || null;
}

async function findStoreTheme({ storeDbId, shopifyId }, runner = { query }) {
  if (!storeDbId || !shopifyId) {
    return null;
  }

  const result = await runner.query(
    `
      SELECT id, store_id, shopify_id, name, version, preset, role, purchase_date, created_at
      FROM store_themes
      WHERE store_id = $1 AND shopify_id = $2
      LIMIT 1
    `,
    [storeDbId, shopifyId],
  );

  return result.rows[0] || null;
}

module.exports = {
  findStoreTheme,
  upsertStoreTheme,
};
