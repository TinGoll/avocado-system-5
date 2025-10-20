import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { In, Repository } from 'typeorm';
import { ProductOptionModifier } from '../products/entities/product-option-modifier.entity';
import { ModifierType } from '../modifiers/entities/modifier.entity';

@Injectable()
export class PriceCalculationService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductOptionModifier)
    private readonly modifierRuleRepository: Repository<ProductOptionModifier>,
  ) {}

  /**
   * Рассчитывает цену продукта на основе выбранных опций.
   * @param productId - ID продукта
   * @param optionIds - Массив ID выбранных опций
   * @returns Объект с базовой и итоговой ценой
   */
  async calculatePrice(
    productId: number,
    optionIds: number[],
  ): Promise<{ basePrice: number; finalPrice: number }> {
    // 1. Находим продукт и его базовую цену
    const product = await this.productRepository.findOneBy({ id: productId });
    if (!product) {
      throw new NotFoundException(`Продукт с ID ${productId} не найден.`);
    }

    let finalPrice = product.basePrice;

    // Если опции не выбраны, цена остается базовой
    if (!optionIds || optionIds.length === 0) {
      return { basePrice: product.basePrice, finalPrice };
    }

    // 2. Находим все правила, которые применяются к этому продукту и выбранным опциям
    const applicableRules = await this.modifierRuleRepository.find({
      where: {
        product: { id: productId },
        option: { id: In(optionIds) }, // Находим все правила для выбранных опций
      },
      relations: ['modifier'], // Убедимся, что данные модификатора загружены
    });

    // 3. Последовательно применяем каждый найденный модификатор
    for (const rule of applicableRules) {
      const modifier = rule.modifier;
      if (!modifier) continue;

      switch (modifier.type) {
        case ModifierType.PERCENTAGE_MULTIPLIER:
          finalPrice *= modifier.value;
          break;
        case ModifierType.FIXED_ADDITION:
          finalPrice += modifier.value;
          break;
        default:
          // Нужно добавить логирование для неизвестных типов модификаторов
          break;
      }
    }

    return {
      basePrice: product.basePrice,
      finalPrice: Math.round(finalPrice * 100) / 100, // Округляем до 2 знаков
    };
  }
}
