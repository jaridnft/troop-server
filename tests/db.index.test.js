describe('db module configuration and bootstrap', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('uses SSL in production when DATABASE_URL is present', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.NODE_ENV = 'production';

    const poolMock = {
      query: jest.fn(),
      connect: jest.fn(),
    };
    const Pool = jest.fn(() => poolMock);
    jest.doMock('pg', () => ({ Pool }));

    require('../db');

    expect(Pool).toHaveBeenCalledWith({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  });

  test('disables SSL outside production', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.NODE_ENV = 'test';

    const poolMock = {
      query: jest.fn(),
      connect: jest.fn(),
    };
    const Pool = jest.fn(() => poolMock);
    jest.doMock('pg', () => ({ Pool }));

    require('../db');

    expect(Pool).toHaveBeenCalledWith({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });
  });

  test('initDb creates required tables', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.NODE_ENV = 'production';

    const query = jest.fn().mockResolvedValue({ rows: [] });
    const poolMock = {
      query,
      connect: jest.fn(),
    };
    const Pool = jest.fn(() => poolMock);
    jest.doMock('pg', () => ({ Pool }));

    const { initDb } = require('../db');
    await initDb();

    expect(query).toHaveBeenCalledTimes(1);
    const initSql = query.mock.calls[0][0];
    expect(initSql).toContain('CREATE TABLE IF NOT EXISTS merchants');
    expect(initSql).toContain('CREATE TABLE IF NOT EXISTS stores');
    expect(initSql).toContain('CREATE TABLE IF NOT EXISTS store_themes');
  });
});
