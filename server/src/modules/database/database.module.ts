import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseOptions } from './database-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => createDatabaseOptions({ autoLoadEntities: true }),
    }),
  ],
})
export class DatabaseModule {}
