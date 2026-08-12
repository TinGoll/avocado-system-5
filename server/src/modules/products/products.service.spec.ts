import { BadRequestException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import { PriceModifier } from '../price-modifiers/entities/price-modifier.entity';
import { ProductionOperation } from '../production-operations/entities/production-operation.entity';
import { ProductTemplate } from './entities/product-template.entity';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const templateId = '11111111-1111-4111-8111-111111111111';
  const modifierId = '22222222-2222-4222-8222-222222222222';

  let service: ProductsService;
  let manager: EntityManager;
  let findBy: jest.MockedFunction<
    (
      entity: typeof PriceModifier,
      where: Record<string, unknown>,
    ) => Promise<PriceModifier[]>
  >;
  let save: jest.MockedFunction<
    (
      entity: typeof ProductTemplate,
      template: ProductTemplate,
    ) => Promise<ProductTemplate>
  >;
  let relationBuilder: {
    relation: jest.Mock;
    of: jest.Mock;
    add: jest.Mock;
  };

  beforeEach(() => {
    relationBuilder = {
      relation: jest.fn(),
      of: jest.fn(),
      add: jest.fn().mockResolvedValue(undefined),
    };
    relationBuilder.relation.mockReturnValue(relationBuilder);
    relationBuilder.of.mockReturnValue(relationBuilder);

    const create = jest.fn(
      (_entity: typeof ProductTemplate, data: Partial<ProductTemplate>) =>
        Object.assign(new ProductTemplate(), data),
    );
    findBy = jest.fn();
    save = jest.fn(
      (_entity: typeof ProductTemplate, template: ProductTemplate) =>
        Promise.resolve(Object.assign(template, { id: templateId })),
    );
    manager = {
      create,
      findBy,
      save,
      createQueryBuilder: jest.fn().mockReturnValue(relationBuilder),
    } as unknown as EntityManager;

    const transaction = jest.fn(
      (callback: (entityManager: EntityManager) => Promise<unknown>) =>
        callback(manager),
    );
    const dataSource = {
      transaction,
    } as unknown as DataSource;

    service = new ProductsService(
      {} as Repository<ProductTemplate>,
      {} as Repository<ProductionOperation>,
      dataSource,
    );
  });

  it('creates a product and binds selected price modifiers', async () => {
    const modifier = { id: modifierId, name: 'Срочность' } as PriceModifier;
    findBy.mockResolvedValueOnce([modifier]);

    const result = await service.create({
      name: 'Фасад',
      baseCustomerPrice: 100,
      priceModifierIds: [modifierId],
    });

    expect(findBy).toHaveBeenCalledTimes(1);
    expect(findBy.mock.calls[0][0]).toBe(PriceModifier);
    expect(relationBuilder.relation).toHaveBeenCalledWith(
      PriceModifier,
      'productTemplates',
    );
    expect(relationBuilder.of).toHaveBeenCalledWith([modifierId]);
    expect(relationBuilder.add).toHaveBeenCalledWith(templateId);
    expect(result.priceModifiers).toEqual([modifier]);
  });

  it('rejects unknown price modifiers before saving the product', async () => {
    findBy.mockResolvedValueOnce([]);

    await expect(
      service.create({
        name: 'Фасад',
        baseCustomerPrice: 100,
        priceModifierIds: [modifierId],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(save).not.toHaveBeenCalled();
    expect(relationBuilder.add).not.toHaveBeenCalled();
  });
});
