describe('license service modes', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('mock mode returns deterministic response without calling Shopify API', async () => {
    const requestSpy = jest.fn();
    jest.doMock('https', () => ({
      request: requestSpy,
    }));
    jest.doMock('../config', () => ({
      apiUrl: 'https://example.test/graphql',
      requestOptions: {},
      whiteList: [],
      licenseMode: 'mock',
    }));

    const { evaluateLicense } = require('../services/license');
    const result = await evaluateLicense('Store.MyShopify.com', 'Origin');

    expect(requestSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      shop: 'store.myshopify.com',
      theme: 'origin',
      purchased: true,
      source: 'mock',
    });
  });

  test('mock mode marks theme "unlicensed" as not purchased', async () => {
    jest.doMock('https', () => ({
      request: jest.fn(),
    }));
    jest.doMock('../config', () => ({
      apiUrl: 'https://example.test/graphql',
      requestOptions: {},
      whiteList: [],
      licenseMode: 'mock',
    }));

    const { evaluateLicense } = require('../services/license');
    const result = await evaluateLicense('store.myshopify.com', 'unlicensed');

    expect(result.purchased).toBe(false);
    expect(result.source).toBe('mock');
  });

  test('live mode uses Shopify API response to evaluate purchase', async () => {
    let endHandler = () => {};
    let dataHandler = () => {};
    const writeSpy = jest.fn();
    const endSpy = jest.fn();

    const requestMock = {
      on: jest.fn(),
      setTimeout: jest.fn(),
      write: writeSpy,
      end: endSpy.mockImplementation(() => {
        dataHandler(
          JSON.stringify({
            data: {
              transactions: {
                edges: [
                  {
                    node: {
                      theme: { name: 'Origin' },
                    },
                  },
                ],
              },
            },
          }),
        );
        endHandler();
      }),
    };

    const responseMock = {
      statusCode: 200,
      on: jest.fn((eventName, handler) => {
        if (eventName === 'data') {
          dataHandler = handler;
        }
        if (eventName === 'end') {
          endHandler = handler;
        }
      }),
    };

    jest.doMock('https', () => ({
      request: jest.fn((url, options, callback) => {
        callback(responseMock);
        return requestMock;
      }),
    }));
    jest.doMock('../config', () => ({
      apiUrl: 'https://example.test/graphql',
      requestOptions: { method: 'POST' },
      whiteList: [],
      licenseMode: 'live',
    }));

    const { evaluateLicense } = require('../services/license');
    const result = await evaluateLicense('store.myshopify.com', 'origin');

    expect(writeSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();
    expect(result).toEqual({
      shop: 'store.myshopify.com',
      theme: 'origin',
      purchased: true,
    });
  });
});
