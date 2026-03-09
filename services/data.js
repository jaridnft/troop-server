const { withTransaction } = require('../db');
const {
  findMerchantByEmail,
  upsertMerchantByEmail,
} = require('../models/merchant');
const { findStoreByShopifyId, upsertStoreByShopifyId } = require('../models/store');
const { findStoreTheme, upsertStoreTheme } = require('../models/storeTheme');

class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
    this.statusCode = 400;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SHOPIFY_ID_REGEX = /^\d+$/;
const DOMAIN_REGEX = /^(?=.{1,253}$)(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

function getObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null;
}

function normalizeString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const str = String(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return str.length ? str : null;
}

function normalizeMerchant(payload) {
  const merchant = getObject(payload.merchant) || {};
  const email = normalizeString(merchant.email);

  if (!email) {
    throw new InputError('Missing merchant.email');
  } else if (!EMAIL_REGEX.test(email)) {
    throw new InputError('Invalid merchant.email');
  }

  return {
    email: email.toLowerCase(),
  };
}

function normalizeStore(payload) {
  const store = getObject(payload.store) || {};
  const shopifyId = normalizeString(store.shopify_id ?? store.id);
  const domain = normalizeString(store.domain);

  if (!shopifyId) {
    throw new InputError('Missing store.shopify_id');
  } else if (!SHOPIFY_ID_REGEX.test(shopifyId)) {
    throw new InputError('Invalid store.shopify_id');
  } else if (!domain) {
    throw new InputError('Missing store.domain');
  } else if (!DOMAIN_REGEX.test(domain)) {
    throw new InputError('Invalid store.domain');
  }

  return {
    shopifyId,
    domain: domain.toLowerCase(),
  };
}

function normalizeTheme(payload) {
  const theme = getObject(payload.theme) || {};
  const shopifyId = normalizeString(theme.shopify_id ?? theme.id);

  if (!shopifyId) {
    throw new InputError('Missing theme.shopify_id');
  } else if (!SHOPIFY_ID_REGEX.test(shopifyId)) {
    throw new InputError('Invalid theme.shopify_id');
  }

  return {
    shopifyId,
    name: normalizeString(theme.name),
    version: normalizeString(theme.version),
    preset: normalizeString(theme.preset),
    role: normalizeString(theme.role),
  };
}

function isDemoRole(role) {
  return normalizeString(role)?.toLowerCase() === 'demo';
}

function isPurchasableRole(role) {
  const normalizedRole = normalizeString(role)?.toLowerCase();
  return normalizedRole === 'main' || normalizedRole === 'unpublished';
}

function shouldSetPurchaseDate(existingStoreTheme, incomingRole) {
  if (!existingStoreTheme || existingStoreTheme.purchase_date) {
    return false;
  }

  const existingIsDemo = isDemoRole(existingStoreTheme.role);
  return existingIsDemo && isPurchasableRole(incomingRole);
}

async function resolveMerchant(merchantInput, runner) {
  const existingMerchant = await findMerchantByEmail(merchantInput.email, runner);
  const merchant = await upsertMerchantByEmail(merchantInput, runner);
  return { merchant, created: !existingMerchant };
}

async function resolveStore(storeInput, merchantId, runner) {
  const existingStore = await findStoreByShopifyId(storeInput.shopifyId, runner);
  const store = await upsertStoreByShopifyId(
    {
      merchantId,
      ...storeInput,
    },
    runner,
  );
  return { store, created: !existingStore };
}

async function resolveStoreTheme(themeInput, storeDbId, runner) {
  const existingStoreTheme = await findStoreTheme(
    {
      storeDbId,
      shopifyId: themeInput.shopifyId,
    },
    runner,
  );

  const storeTheme = await upsertStoreTheme(
    {
      storeDbId,
      shopifyId: themeInput.shopifyId,
      name: themeInput.name,
      version: themeInput.version,
      preset: themeInput.preset,
      role: themeInput.role,
      purchaseDate: shouldSetPurchaseDate(existingStoreTheme, themeInput.role) ? new Date() : null,
    },
    runner,
  );

  return { storeTheme, created: !existingStoreTheme };
}

async function persistDataPayload(payload) {
  if (!getObject(payload)) {
    throw new InputError('Invalid payload. Expected a JSON object.');
  }

  const merchantInput = normalizeMerchant(payload);
  const storeInput = normalizeStore(payload);
  const themeInput = normalizeTheme(payload);

  return withTransaction(async (runner) => {
    const { merchant, created: merchantCreated } = await resolveMerchant(merchantInput, runner);

    const { store, created: storeCreated } = await resolveStore(storeInput, merchant.id, runner);

    const { storeTheme, created: storeThemeCreated } = await resolveStoreTheme(themeInput, store.id, runner);

    return {
      merchant,
      store,
      storeTheme,
      merchantCreated,
      storeCreated,
      storeThemeCreated,
    };
  });
}

module.exports = {
  InputError,
  persistDataPayload,
};
