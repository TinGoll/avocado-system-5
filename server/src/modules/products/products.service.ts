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
import { DataSource, In, Repository } from 'typeorm';
import { PriceModifier } from '../price-modifiers/entities/price-modifier.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductTemplate)
    private readonly productsRepository: Repository<ProductTemplate>,
    @InjectRepository(ProductionOperation)
    private readonly operationsRepository: Repository<ProductionOperation>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreateProductDto): Promise<ProductTemplate> {
    const { operationIds, priceModifierIds, ...productData } = createDto;

    return this.dataSource.transaction(async (manager) => {
      const template = manager.create(ProductTemplate, productData);

      if (operationIds && operationIds.length > 0) {
        const operations = await manager.findBy(ProductionOperation, {
          id: In(operationIds),
        });
        if (operations.length !== operationIds.length) {
          throw new BadRequestException(
            'One or more operation IDs are invalid.',
          );
        }
        template.operations = operations;
      }

      let priceModifiers: PriceModifier[] = [];
      if (priceModifierIds && priceModifierIds.length > 0) {
        priceModifiers = await manager.findBy(PriceModifier, {
          id: In(priceModifierIds),
        });
        if (priceModifiers.length !== priceModifierIds.length) {
          throw new BadRequestException(
            'One or more price modifier IDs are invalid.',
          );
        }
      }

      const savedTemplate = await manager.save(ProductTemplate, template);

      if (priceModifierIds && priceModifierIds.length > 0) {
        await manager
          .createQueryBuilder()
          .relation(PriceModifier, 'productTemplates')
          .of(priceModifierIds)
          .add(savedTemplate.id);
      }

      savedTemplate.priceModifiers = priceModifiers;
      return savedTemplate;
    });
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
