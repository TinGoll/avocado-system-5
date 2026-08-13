import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { createDatabaseOptions } from './database-options';

export default new DataSource(
  createDatabaseOptions({
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  }) as DataSourceOptions,
);
