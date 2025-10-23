import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePriceModifierDto } from './dto/create-price-modifier.dto';
import { UpdatePriceModifierDto } from './dto/update-price-modifier.dto';
import { PriceModifier } from './entities/price-modifier.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductTemplate } from '../products/entities/product-template.entity';

@Injectable()
export class PriceModifiersService {
  constructor(
    @InjectRepository(PriceModifier)
    private readonly modifiersRepository: Repository<PriceModifier>,
    @InjectRepository(ProductTemplate)
    private readonly templatesRepository: Repository<ProductTemplate>,
  ) {}

  async create(createDto: CreatePriceModifierDto): Promise<PriceModifier> {
    const { productTemplateIds, ...modifierData } = createDto;
    const modifier = this.modifiersRepository.create(modifierData);

    if (productTemplateIds && productTemplateIds.length > 0) {
      const templates = await this.templatesRepository.findBy({
        id: In(productTemplateIds),
      });
      if (templates.length !== productTemplateIds.length) {
        throw new BadRequestException(
          'One or more product template IDs are invalid.',
        );
      }
      modifier.productTemplates = templates;
    }

    return this.modifiersRepository.save(modifier);
  }

  findAll() {
    return this.modifiersRepository.find();
  }

  async findOne(id: string) {
    const modifier = await this.modifiersRepository.findOneBy({ id });
    if (!modifier) {
      throw new NotFoundException(`Modifier with ID "${id}" not found`);
    }
    return modifier;
  }

  async update(
    id: string,
    updateDto: UpdatePriceModifierDto,
  ): Promise<PriceModifier> {
    const { productTemplateIds, ...modifierData } = updateDto;
    const modifier = await this.modifiersRepository.preload({
      id,
      ...modifierData,
    });
    if (!modifier) {
      throw new NotFoundException(`Modifier with ID "${id}" not found`);
    }

    if (productTemplateIds) {
      // Если массив передан (даже пустой)
      if (productTemplateIds.length > 0) {
        const templates = await this.templatesRepository.findBy({
          id: In(productTemplateIds),
        });
        if (templates.length !== productTemplateIds.length) {
          throw new BadRequestException(
            'One or more product template IDs are invalid.',
          );
        }
        modifier.productTemplates = templates;
      } else {
        modifier.productTemplates = [];
      }
    }

    return this.modifiersRepository.save(modifier);
  }

  async remove(id: string) {
    const modifier = await this.findOne(id);
    await this.modifiersRepository.remove(modifier);
    return modifier;
  }
}
