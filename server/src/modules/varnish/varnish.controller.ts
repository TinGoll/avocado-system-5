import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { VarnishService } from './varnish.service';
import { CreateVarnishDto } from './dto/create-varnish.dto';
import { UpdateVarnishDto } from './dto/update-varnish.dto';

@Controller('varnish')
export class VarnishController {
  constructor(private readonly varnishService: VarnishService) {}

  @Post()
  create(@Body() createVarnishDto: CreateVarnishDto) {
    return this.varnishService.create(createVarnishDto);
  }

  @Get()
  findAll() {
    return this.varnishService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.varnishService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVarnishDto: UpdateVarnishDto) {
    return this.varnishService.update(id, updateVarnishDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.varnishService.remove(id);
  }
}
