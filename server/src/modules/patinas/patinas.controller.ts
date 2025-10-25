import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PatinasService } from './patinas.service';
import { CreatePatinaDto } from './dto/create-patina.dto';
import { UpdatePatinaDto } from './dto/update-patina.dto';

@Controller('patinas')
export class PatinasController {
  constructor(private readonly patinasService: PatinasService) {}

  @Post()
  create(@Body() createPatinaDto: CreatePatinaDto) {
    return this.patinasService.create(createPatinaDto);
  }

  @Get()
  findAll() {
    return this.patinasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patinasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePatinaDto: UpdatePatinaDto) {
    return this.patinasService.update(id, updatePatinaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patinasService.remove(id);
  }
}
