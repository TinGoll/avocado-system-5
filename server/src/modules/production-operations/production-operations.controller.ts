import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ProductionOperationsService } from './production-operations.service';
import { CreateProductionOperationDto } from './dto/create-production-operation.dto';
import { UpdateProductionOperationDto } from './dto/update-production-operation.dto';

@Controller('production-operations')
export class ProductionOperationsController {
  constructor(
    private readonly operationsService: ProductionOperationsService,
  ) {}

  @Post()
  create(@Body() createDto: CreateProductionOperationDto) {
    return this.operationsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.operationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.operationsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProductionOperationDto,
  ) {
    return this.operationsService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.operationsService.remove(id);
  }
}
