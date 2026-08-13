export type DatabaseKind = 'postgres' | 'sqlite';

const DEFAULT_DATABASE_KIND: DatabaseKind = 'postgres';
let resolvedDatabaseKind: DatabaseKind | undefined;

export function getDatabaseKind(): DatabaseKind {
  if (resolvedDatabaseKind) {
    return resolvedDatabaseKind;
  }

  const configuredKind = process.env.DB_TYPE?.trim().toLowerCase();
  if (!configuredKind) {
    resolvedDatabaseKind = DEFAULT_DATABASE_KIND;
    return resolvedDatabaseKind;
  }

  if (configuredKind !== 'postgres' && configuredKind !== 'sqlite') {
    throw new Error(
      `Unsupported DB_TYPE "${process.env.DB_TYPE}". Expected "postgres" or "sqlite".`,
    );
  }

  resolvedDatabaseKind = configuredKind;
  return resolvedDatabaseKind;
}
