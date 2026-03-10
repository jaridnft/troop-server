describe('license service', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('uses Shopify API response to evaluate purchase', async () => {
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
