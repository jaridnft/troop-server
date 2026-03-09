jest.mock('../db', () => ({
  withTransaction: jest.fn(),
}));

jest.mock('../models/merchant', () => ({
  findMerchantByEmail: jest.fn(),
  upsertMerchantByEmail: jest.fn(),
}));

jest.mock('../models/store', () => ({
  findStoreByShopifyId: jest.fn(),
  upsertStoreByShopifyId: jest.fn(),
}));

jest.mock('../models/storeTheme', () => ({
  findStoreTheme: jest.fn(),
  upsertStoreTheme: jest.fn(),
}));

const { withTransaction } = require('../db');
const { findMerchantByEmail, upsertMerchantByEmail } = require('../models/merchant');
const { findStoreByShopifyId, upsertStoreByShopifyId } = require('../models/store');
const { findStoreTheme, upsertStoreTheme } = require('../models/storeTheme');
const { persistDataPayload } = require('../services/data');

describe('persistDataPayload sanitization', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    withTransaction.mockImplementation(async (runInTransaction) => runInTransaction({ query: jest.fn() }));
    findMerchantByEmail.mockResolvedValue(null);
    findStoreByShopifyId.mockResolvedValue(null);
    findStoreTheme.mockResolvedValue(null);

    upsertMerchantByEmail.mockResolvedValue({
      id: 1,
      email: 'merchant@example.com',
    });
    upsertStoreByShopifyId.mockResolvedValue({
      id: 2,
      merchant_id: 1,
      shopify_id: '12345',
      domain: 'example.myshopify.com',
    });
    upsertStoreTheme.mockResolvedValue({
      id: 3,
      store_id: 2,
      shopify_id: '678',
      name: 'Dawn',
      version: '12.0',
      preset: 'Default',
      role: 'main',
      purchase_date: null,
    });
  });

  test('sanitizes all persisted fields before model writes', async () => {
    await persistDataPayload({
      merchant: { email: '  Merchant@Example.com \n' },
      store: {
        shopify_id: '\t12345 ',
        domain: ' Example.MyShopify.com ',
      },
      theme: {
        shopify_id: ' 678 ',
        name: ' Dawn \u0000 ',
        version: ' 12.0 ',
        preset: ' Default ',
        role: ' main ',
      },
    });

    expect(upsertMerchantByEmail).toHaveBeenCalledWith({ email: 'merchant@example.com' }, expect.any(Object));
    expect(upsertStoreByShopifyId).toHaveBeenCalledWith(
      {
        merchantId: 1,
        shopifyId: '12345',
        domain: 'example.myshopify.com',
      },
      expect.any(Object),
    );
    expect(upsertStoreTheme).toHaveBeenCalledWith(
      {
        storeDbId: 2,
        shopifyId: '678',
        name: 'Dawn',
        version: '12.0',
        preset: 'Default',
        role: 'main',
        purchaseDate: null,
      },
      expect.any(Object),
    );
  });

  test('sets purchaseDate when theme transitions from demo to non-demo', async () => {
    findStoreTheme.mockResolvedValue({
      id: 3,
      store_id: 2,
      shopify_id: '678',
      role: 'demo',
      purchase_date: null,
    });

    await persistDataPayload({
      merchant: { email: 'merchant@example.com' },
      store: { shopify_id: '12345', domain: 'example.myshopify.com' },
      theme: { shopify_id: '678', role: 'main' },
    });

    expect(upsertStoreTheme).toHaveBeenCalledWith(
      expect.objectContaining({
        shopifyId: '678',
        role: 'main',
        purchaseDate: expect.any(Date),
      }),
      expect.any(Object),
    );
  });

  test('sets purchaseDate when theme transitions from demo to unpublished', async () => {
    findStoreTheme.mockResolvedValue({
      id: 3,
      store_id: 2,
      shopify_id: '678',
      role: 'demo',
      purchase_date: null,
    });

    await persistDataPayload({
      merchant: { email: 'merchant@example.com' },
      store: { shopify_id: '12345', domain: 'example.myshopify.com' },
      theme: { shopify_id: '678', role: 'unpublished' },
    });

    expect(upsertStoreTheme).toHaveBeenCalledWith(
      expect.objectContaining({
        shopifyId: '678',
        role: 'unpublished',
        purchaseDate: expect.any(Date),
      }),
      expect.any(Object),
    );
  });

});
