import { isAbsolute } from 'node:path';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { getDatabaseKind } from './database-kind';

export interface DatabaseOptionsFactoryOptions {
  autoLoadEntities?: boolean;
  entities?: TypeOrmModuleOptions['entities'];
}

export function createDatabaseOptions(
  options: DatabaseOptionsFactoryOptions = {},
): TypeOrmModuleOptions {
  const kind = getDatabaseKind();
  const sharedOptions = {
    autoLoadEntities: options.autoLoadEntities,
    entities: options.entities,
    synchronize: false,
    migrationsRun: true,
  };

  if (kind === 'sqlite') {
    const database = process.env.DB_PATH?.trim();
    if (!database) {
      throw new Error('DB_PATH is required when DB_TYPE=sqlite.');
    }
    if (!isAbsolute(database)) {
      throw new Error('DB_PATH must be an absolute path when DB_TYPE=sqlite.');
    }

    return {
      ...sharedOptions,
      type: 'better-sqlite3',
      database,
      enableWAL: true,
      prepareDatabase: (sqliteDatabase) => {
        sqliteDatabase.function(
          'unicode_lower',
          { deterministic: true },
          (value: unknown) => String(value).toLocaleLowerCase('ru-RU'),
        );
      },
      migrations: [__dirname + '/migrations/sqlite/*{.ts,.js}'],
    };
  }

  return {
    ...sharedOptions,
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    migrations: [__dirname + '/migrations/postgres/*{.ts,.js}'],
  };
}
