import { ConflictException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  it('drops the database and restores its schema with migrations', async () => {
    const dropDatabase = jest.fn().mockResolvedValue(undefined);
    const runMigrations = jest.fn().mockResolvedValue([]);
    const service = new DatabaseService({
      dropDatabase,
      runMigrations,
    } as unknown as DataSource);

    await expect(service.reset()).resolves.toEqual({ success: true });
    expect(dropDatabase).toHaveBeenCalledTimes(1);
    expect(runMigrations).toHaveBeenCalledTimes(1);
    expect(dropDatabase.mock.invocationCallOrder[0]).toBeLessThan(
      runMigrations.mock.invocationCallOrder[0],
    );
  });

  it('rejects a concurrent reset', async () => {
    let finishDrop: (() => void) | undefined;
    const dropDatabase = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDrop = resolve;
        }),
    );
    const service = new DatabaseService({
      dropDatabase,
      runMigrations: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource);

    const firstReset = service.reset();
    await expect(service.reset()).rejects.toBeInstanceOf(ConflictException);
    finishDrop?.();
    await firstReset;
  });
});
