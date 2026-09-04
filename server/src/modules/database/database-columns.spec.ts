import { getMetadataArgsStorage } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { FacadeProfile } from '../facade-profiles/entities/facade-profile.entity';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Panel } from '../panels/entities/panel.entity';
import { PriceModifier } from '../price-modifiers/entities/price-modifier.entity';
import { ProductionOperation } from '../production-operations/entities/production-operation.entity';
import { ProductTemplate } from '../products/entities/product-template.entity';

describe('PostgreSQL column metadata', () => {
  it('keeps all database JSON columns as jsonb', () => {
    const jsonColumns = getMetadataArgsStorage()
      .columns.filter(({ target }) =>
        [
          Customer,
          FacadeProfile,
          OrderGroup,
          Order,
          OrderItem,
          Panel,
          PriceModifier,
          ProductTemplate,
        ].includes(target as never),
      )
      .filter(({ options }) => options.type === 'jsonb');

    expect(jsonColumns).toHaveLength(11);
  });

  it('uses simple-enum with stable legacy-compatible PostgreSQL names', () => {
    const enumColumns = getMetadataArgsStorage()
      .columns.filter(({ target }) =>
        [
          Customer,
          OrderGroup,
          PriceModifier,
          ProductionOperation,
          ProductTemplate,
        ].includes(target as never),
      )
      .filter(({ options }) => options.type === 'simple-enum');

    expect(enumColumns.map(({ options }) => options.enumName)).toEqual(
      expect.arrayContaining([
        'customers_level_enum',
        'order_groups_status_enum',
        'price_modifiers_type_enum',
        'production_operations_calculationmethod_enum',
        'product_templates_customerpricingmethod_enum',
      ]),
    );
  });
});
