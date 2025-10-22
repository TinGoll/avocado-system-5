import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductTemplate } from './entities/product-template.entity';
import { ProductionOperation } from '../production-operations/entities/production-operation.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductTemplate)
    private readonly productsRepository: Repository<ProductTemplate>,
    @InjectRepository(ProductionOperation)
    private readonly operationsRepository: Repository<ProductionOperation>,
  ) {}

  async create(createDto: CreateProductDto): Promise<ProductTemplate> {
    const { operationIds, ...productData } = createDto;

    const template = this.productsRepository.create(productData);

    if (operationIds && operationIds.length > 0) {
      const operations = await this.operationsRepository.findBy({
        id: In(operationIds),
      });
      if (operations.length !== operationIds.length) {
        throw new BadRequestException('One or more operation IDs are invalid.');
      }
      template.operations = operations;
    }

    return this.productsRepository.save(template);
  }

  findAll(): Promise<ProductTemplate[]> {
    return this.productsRepository.find();
  }

  async findOne(id: string): Promise<ProductTemplate> {
    const template = await this.productsRepository.findOneBy({ id });
    if (!template) {
      throw new NotFoundException(`Product template with ID "${id}" not found`);
    }
    return template;
  }

  async update(
    id: string,
    updateDto: UpdateProductDto,
  ): Promise<ProductTemplate> {
    const { operationIds, ...productData } = updateDto;

    const template = await this.productsRepository.preload({
      id,
      ...productData,
    });

    if (!template) {
      throw new NotFoundException(`Product template with ID "${id}" not found`);
    }

    if (operationIds) {
      if (operationIds.length > 0) {
        const operations = await this.operationsRepository.findBy({
          id: In(operationIds),
        });
        if (operations.length !== operationIds.length) {
          throw new BadRequestException(
            'One or more operation IDs are invalid.',
          );
        }
        template.operations = operations;
      } else {
        template.operations = [];
      }
    }

    return this.productsRepository.save(template);
  }

  async remove(id: string): Promise<ProductTemplate> {
    const template = await this.findOne(id);
    await this.productsRepository.remove(template);
    return template;
  }
}
