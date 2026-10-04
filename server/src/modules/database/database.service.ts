import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService {
  private resetInProgress = false;

  constructor(private readonly dataSource: DataSource) {}

  async reset(): Promise<{ success: true }> {
    if (this.resetInProgress) {
      throw new ConflictException('Сброс базы данных уже выполняется');
    }

    this.resetInProgress = true;
    try {
      await this.dataSource.dropDatabase();
      await this.dataSource.runMigrations();
      return { success: true };
    } finally {
      this.resetInProgress = false;
    }
  }
}
