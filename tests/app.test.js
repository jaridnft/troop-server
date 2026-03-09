process.env.whiteList = process.env.whiteList || '[]';
process.env.partnerId = process.env.partnerId || 'test-partner';
process.env.partnerToken = process.env.partnerToken || 'test-token';

const request = require('supertest');

jest.mock('../services/license', () => ({
  evaluateLicense: jest.fn(),
}));

jest.mock('../services/data', () => {
  class InputError extends Error {
    constructor(message) {
      super(message);
      this.name = 'InputError';
      this.statusCode = 400;
    }
  }

  return {
    InputError,
    persistDataPayload: jest.fn(),
  };
});

const { app } = require('../app');
const { evaluateLicense } = require('../services/license');
const { persistDataPayload, InputError } = require('../services/data');

describe('license route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET / returns 400 when query params are missing', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(400);
    expect(response.text).toBe('Missing required query parameters: shop and theme');
  });

  test('GET / forwards query params to evaluator and returns result', async () => {
    evaluateLicense.mockResolvedValue({
      shop: 'store.myshopify.com',
      theme: 'origin',
      purchased: true,
    });

    const response = await request(app)
      .get('/')
      .query({ shop: 'store.myshopify.com', theme: 'origin' });

    expect(evaluateLicense).toHaveBeenCalledWith('store.myshopify.com', 'origin');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      shop: 'store.myshopify.com',
      theme: 'origin',
      purchased: true,
    });
  });

  test('GET / returns legacy API error string when evaluator throws', async () => {
    evaluateLicense.mockRejectedValue(new Error('request failed'));

    const response = await request(app)
      .get('/')
      .query({ shop: 'store.myshopify.com', theme: 'origin' });

    expect(response.status).toBe(200);
    expect(response.text).toBe('Error with request to API');
  });
});

describe('data route', () => {
  const allowedOrigin = 'https://admin.shopify.com';
  const validPayload = {
    merchant: { email: 'merchant@example.com' },
    store: { shopify_id: '12345', domain: 'example.myshopify.com' },
    theme: { shopify_id: '100', name: 'Origin' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('OPTIONS /data accepts allowed Shopify origin', async () => {
    const response = await request(app).options('/data').set('Origin', allowedOrigin);

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-methods']).toBe('POST, OPTIONS');
    expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
  });

  test('POST /data rejects disallowed origins', async () => {
    const response = await request(app)
      .post('/data')
      .set('Origin', 'https://example.com')
      .send(validPayload);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Origin not allowed' });
  });

  test('POST /data rejects invalid payload shape before persistence', async () => {
    const response = await request(app)
      .post('/data')
      .set('Origin', allowedOrigin)
      .send([]);

    expect(persistDataPayload).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid payload. Expected a JSON object.',
    });
  });

  test('POST /data returns 201 when at least one record is created', async () => {
    persistDataPayload.mockResolvedValue({
      merchantCreated: true,
      storeCreated: false,
      storeThemeCreated: false,
      merchant: { id: 1, email: 'merchant@example.com' },
      store: { id: 5, shopify_id: '12345' },
      storeTheme: { id: 9, shopify_id: '100' },
    });

    const response = await request(app)
      .post('/data')
      .set('Origin', allowedOrigin)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.accepted).toBe(true);
    expect(response.body.message).toBe('Data payload processed.');
    expect(response.body.merchantCreated).toBe(true);
  });

  test('POST /data returns 200 when records already exist', async () => {
    persistDataPayload.mockResolvedValue({
      merchantCreated: false,
      storeCreated: false,
      storeThemeCreated: false,
      merchant: { id: 1, email: 'merchant@example.com' },
      store: { id: 5, shopify_id: '12345' },
      storeTheme: { id: 9, shopify_id: '100' },
    });

    const response = await request(app)
      .post('/data')
      .set('Origin', allowedOrigin)
      .send(validPayload);

    expect(response.status).toBe(200);
    expect(response.body.accepted).toBe(true);
  });

  test('POST /data returns InputError status and message', async () => {
    persistDataPayload.mockRejectedValue(new InputError('Invalid store.shopify_id'));

    const response = await request(app)
      .post('/data')
      .set('Origin', allowedOrigin)
      .send(validPayload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid store.shopify_id' });
  });

  test('POST /data returns 500 on unexpected persistence error', async () => {
    persistDataPayload.mockRejectedValue(new Error('db offline'));

    const response = await request(app)
      .post('/data')
      .set('Origin', allowedOrigin)
      .send(validPayload);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Could not store data payload.' });
  });
});
