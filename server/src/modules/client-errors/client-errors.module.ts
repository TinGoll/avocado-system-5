import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientErrorsController } from './client-errors.controller';
import { ClientErrorsService } from './client-errors.service';
import { ClientError } from './entities/client-error.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClientError])],
  controllers: [ClientErrorsController],
  providers: [ClientErrorsService],
})
export class ClientErrorsModule {}
