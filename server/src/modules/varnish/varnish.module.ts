import { Module } from '@nestjs/common';
import { VarnishService } from './varnish.service';
import { VarnishController } from './varnish.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Varnish } from './entities/varnish.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Varnish])],
  controllers: [VarnishController],
  providers: [VarnishService],
})
export class VarnishModule {}
