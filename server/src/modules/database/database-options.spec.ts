/* eslint-disable @typescript-eslint/no-require-imports */
describe('createDatabaseOptions', () => {
  const originalDbType = process.env.DB_TYPE;
  const originalDbPath = process.env.DB_PATH;

  afterEach(() => {
    if (originalDbType === undefined) delete process.env.DB_TYPE;
    else process.env.DB_TYPE = originalDbType;
    if (originalDbPath === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = originalDbPath;
    jest.resetModules();
  });

  it('maps sqlite to better-sqlite3 with WAL and isolated migrations', () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = 'C:\\avocado-data\\avocado.sqlite';
    const { createDatabaseOptions } =
      require('./database-options') as typeof import('./database-options');

    expect(createDatabaseOptions()).toMatchObject({
      type: 'better-sqlite3',
      database: process.env.DB_PATH,
      enableWAL: true,
      synchronize: false,
      migrationsRun: true,
      migrations: [expect.stringContaining('/migrations/sqlite/')],
    });
  });

  it('requires an absolute SQLite path', () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = 'relative/avocado.sqlite';
    const { createDatabaseOptions } =
      require('./database-options') as typeof import('./database-options');

    expect(() => createDatabaseOptions()).toThrow(
      'DB_PATH must be an absolute',
    );
  });

  it('defaults PostgreSQL to port 5432 and isolated migrations', () => {
    delete process.env.DB_TYPE;
    delete process.env.DB_PORT;
    const { createDatabaseOptions } =
      require('./database-options') as typeof import('./database-options');

    expect(createDatabaseOptions()).toMatchObject({
      type: 'postgres',
      port: 5432,
      synchronize: false,
      migrationsRun: true,
      migrations: [expect.stringContaining('/migrations/postgres/')],
    });
  });
});
