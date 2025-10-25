import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PanelsService } from './panels.service';
import { CreatePanelDto } from './dto/create-panel.dto';
import { UpdatePanelDto } from './dto/update-panel.dto';

@Controller('panels')
export class PanelsController {
  constructor(private readonly panelsService: PanelsService) {}

  @Post()
  create(@Body() createPanelDto: CreatePanelDto) {
    return this.panelsService.create(createPanelDto);
  }

  @Get()
  findAll() {
    return this.panelsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.panelsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePanelDto: UpdatePanelDto) {
    return this.panelsService.update(id, updatePanelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.panelsService.remove(id);
  }
}
