import { Body, Controller, Post } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ResetDatabaseDto } from './dto/reset-database.dto';

@Controller('database')
export class DatabaseController {
  constructor(private readonly database: DatabaseService) {}

  @Post('reset')
  reset(@Body() dto: ResetDatabaseDto) {
    void dto;
    return this.database.reset();
  }
}
