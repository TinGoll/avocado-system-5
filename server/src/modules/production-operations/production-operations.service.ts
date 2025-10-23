import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductionOperationDto } from './dto/create-production-operation.dto';
import { UpdateProductionOperationDto } from './dto/update-production-operation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductionOperation } from './entities/production-operation.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProductionOperationsService {
  constructor(
    @InjectRepository(ProductionOperation)
    private readonly operationsRepository: Repository<ProductionOperation>,
  ) {}

  create(
    createDto: CreateProductionOperationDto,
  ): Promise<ProductionOperation> {
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
    return this.operationsRepository.save(operation);
  }

  async remove(id: string): Promise<ProductionOperation> {
    const operation = await this.findOne(id);
    await this.operationsRepository.remove(operation);
    return operation;
  }
}
