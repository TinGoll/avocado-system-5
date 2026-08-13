/* eslint-disable @typescript-eslint/no-require-imports */
describe('getDatabaseKind', () => {
  const originalDbType = process.env.DB_TYPE;

  afterEach(() => {
    if (originalDbType === undefined) {
      delete process.env.DB_TYPE;
    } else {
      process.env.DB_TYPE = originalDbType;
    }
    jest.resetModules();
  });

  it('defaults to postgres for backwards compatibility', () => {
    delete process.env.DB_TYPE;
    const { getDatabaseKind } =
      require('./database-kind') as typeof import('./database-kind');

    expect(getDatabaseKind()).toBe('postgres');
  });

  it('accepts both supported database kinds', () => {
    process.env.DB_TYPE = 'sqlite';
    let databaseKind =
      require('./database-kind') as typeof import('./database-kind');
    expect(databaseKind.getDatabaseKind()).toBe('sqlite');

    jest.resetModules();
    process.env.DB_TYPE = 'postgres';
    databaseKind =
      require('./database-kind') as typeof import('./database-kind');
    expect(databaseKind.getDatabaseKind()).toBe('postgres');
  });

  it('rejects unsupported database kinds', () => {
    process.env.DB_TYPE = 'mysql';
    const { getDatabaseKind } =
      require('./database-kind') as typeof import('./database-kind');

    expect(() => getDatabaseKind()).toThrow('Unsupported DB_TYPE');
  });

  it('does not change after the kind has been resolved', () => {
    process.env.DB_TYPE = 'sqlite';
    const { getDatabaseKind } =
      require('./database-kind') as typeof import('./database-kind');
    expect(getDatabaseKind()).toBe('sqlite');

    process.env.DB_TYPE = 'postgres';
    expect(getDatabaseKind()).toBe('sqlite');
  });
});
