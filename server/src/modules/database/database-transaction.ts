import { DataSource, EntityManager } from 'typeorm';

const sqliteWrites = new WeakMap<DataSource, Promise<void>>();

/** Serialize transactions sharing a SQLite connection, including across modules. */
export function runDatabaseTransaction<T>(
  source: DataSource,
  work: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  if (source.options.type !== 'better-sqlite3') return source.transaction(work);
  const task = (sqliteWrites.get(source) ?? Promise.resolve()).then(
    async () => {
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await source.transaction(work);
        } catch (error) {
          const code = (error as { driverError?: { code?: string } })
            .driverError?.code;
          if (
            attempt >= 2 ||
            !['SQLITE_BUSY', 'SQLITE_BUSY_SNAPSHOT'].includes(code ?? '')
          )
            throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, 20 * (attempt + 1)),
          );
        }
      }
    },
  );
  sqliteWrites.set(
    source,
    task.then(
      () => undefined,
      () => undefined,
    ),
  );
  return task;
}
