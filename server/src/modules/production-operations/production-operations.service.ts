import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductionOperationDto } from './dto/create-production-operation.dto';
import { UpdateProductionOperationDto } from './dto/update-production-operation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductionOperation } from './entities/production-operation.entity';
import { Repository } from 'typeorm';
import { ProductionOperationCalculatorService } from './production-operation-calculator.service';
import { PreviewProductionOperationDto } from './dto/preview-production-operation.dto';

@Injectable()
export class ProductionOperationsService {
  constructor(
    @InjectRepository(ProductionOperation)
    private readonly operationsRepository: Repository<ProductionOperation>,
    private readonly calculator: ProductionOperationCalculatorService,
  ) {}

  create(
    createDto: CreateProductionOperationDto,
  ): Promise<ProductionOperation> {
    this.calculator.validate(
      createDto.calculationFormula,
      createDto.displayNameTemplate,
    );
    const operation = this.operationsRepository.create(createDto);
    return this.operationsRepository.save(operation);
  }

  findAll(): Promise<ProductionOperation[]> {
    return this.operationsRepository.find();
  }

  async findOne(id: string): Promise<ProductionOperation> {
    const operation = await this.operationsRepository.findOneBy({ id });
    if (!operation) {
      throw new NotFoundException(`Operation with ID "${id}" not found`);
    }
    return operation;
  }

  async update(
    id: string,
    updateDto: UpdateProductionOperationDto,
  ): Promise<ProductionOperation> {
    const operation = await this.operationsRepository.preload({
      id,
      ...updateDto,
    });
    if (!operation) {
      throw new NotFoundException(`Operation with ID "${id}" not found`);
    }
    this.calculator.validate(
      operation.calculationFormula,
      operation.displayNameTemplate,
    );
    return this.operationsRepository.save(operation);
  }

  preview(previewDto: PreviewProductionOperationDto) {
    const context = this.calculator.contextFromSnapshot(
      previewDto.item,
      previewDto.orderCharacteristics,
    );
    const result = this.calculator.calculate(
      previewDto.calculationFormula,
      previewDto.displayNameTemplate,
      context,
    );
    return {
      ...result,
      calculatedCost:
        Math.round(result.calculatedQuantity * previewDto.costPerUnit * 100) /
        100,
    };
  }

  async remove(id: string): Promise<ProductionOperation> {
    const operation = await this.findOne(id);
    await this.operationsRepository.remove(operation);
    return operation;
  }
}
