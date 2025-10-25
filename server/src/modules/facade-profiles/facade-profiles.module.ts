import { Module } from '@nestjs/common';
import { FacadeProfilesService } from './facade-profiles.service';
import { FacadeProfilesController } from './facade-profiles.controller';
import { FacadeProfile } from './entities/facade-profile.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([FacadeProfile])],
  controllers: [FacadeProfilesController],
  providers: [FacadeProfilesService],
})
export class FacadeProfilesModule {}
