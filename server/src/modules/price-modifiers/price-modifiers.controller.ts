import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PriceModifiersService } from './price-modifiers.service';
import { CreatePriceModifierDto } from './dto/create-price-modifier.dto';
import { UpdatePriceModifierDto } from './dto/update-price-modifier.dto';

@Controller('price-modifiers')
export class PriceModifiersController {
  constructor(private readonly priceModifiersService: PriceModifiersService) {}

  @Post()
  create(@Body() createDto: CreatePriceModifierDto) {
    return this.priceModifiersService.create(createDto);
  }

  @Get()
  findAll() {
    return this.priceModifiersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.priceModifiersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePriceModifierDto) {
    return this.priceModifiersService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.priceModifiersService.remove(id);
  }
}
