import { CustomerLevel } from '../../customers/entities/customer.entity';
import { OrderStatus } from '../../order-groups/entities/order-group.entity';
import { CustomerPricingMethod } from '../../products/entities/product-template.entity';
import {
  ConditionOperator,
  ConditionSource,
} from '../entities/price-modifier.entity';

export type ConditionPathField =
  | { readonly label: string; readonly type: 'string' }
  | { readonly label: string; readonly type: 'number' }
  | {
      readonly label: string;
      readonly type: 'enum';
      readonly options: readonly string[];
    };

export type ConditionPathGroup = {
  readonly label: string;
  readonly children: ConditionPathSchema;
};

export type ConditionPathNode = ConditionPathField | ConditionPathGroup;

export type ConditionPathSchema = {
  readonly [key: string]: ConditionPathNode;
};

export type PriceModifierConditionPathSchemas = Record<
  ConditionSource,
  ConditionPathSchema
>;

const field = (label: string, type: 'string' | 'number'): ConditionPathField =>
  type === 'string' ? { label, type } : { label, type };

const enumField = <T extends string>(
  label: string,
  options: readonly T[],
): ConditionPathField => ({ label, type: 'enum', options });

const group = (
  label: string,
  children: ConditionPathSchema,
): ConditionPathGroup => ({ label, children });

// This response contract is the single source for the client path selector,
// labels and editors, as well as the server-side allowlist and validation.
// Pricing result fields are deliberately absent to prevent cyclic modifiers.
export const PRICE_MODIFIER_CONDITION_PATH_SCHEMAS = {
  [ConditionSource.ORDER_GROUP]: {
    id: field('ID заказа', 'number'),
    orderNumber: field('Номер заказа', 'string'),
    customer: group('Заказчик', {
      name: field('Имя заказчика', 'string'),
      companyName: field('Название компании', 'string'),
      address: field('Адрес', 'string'),
      level: enumField('Уровень лояльности', Object.values(CustomerLevel)),
    }),
    status: enumField('Статус заказа', Object.values(OrderStatus)),
  },
  [ConditionSource.ORDER]: {
    characteristics: group('Параметры документа', {
      thermalSeam: enumField('Термошов', ['Да', 'Нет']),
      drilling: enumField('Присадка', ['Да', 'Нет']),
      color: group('Краситель', {
        name: field('Название', 'string'),
        type: enumField('Тип', ['stain', 'enamel']),
      }),
      material: group('Материал', {
        name: field('Название', 'string'),
        type: enumField('Тип', ['softwood', 'hardwood', 'mdf']),
      }),
      patina: group('Патина', { name: field('Название', 'string') }),
      panel: group('Филёнка', {
        name: field('Название', 'string'),
        characteristics: group('Характеристики', {
          style: field('Стиль', 'string'),
        }),
      }),
      varnish: group('Лак', { name: field('Название', 'string') }),
      profile: group('Фасадный профиль', {
        name: field('Название', 'string'),
        characteristics: group('Характеристики', {
          width: field('Ширина профиля', 'number'),
          grooveDepth: field('Глубина паза', 'number'),
          grooveWidth: field('Ширина паза', 'number'),
          style: field('Стиль', 'string'),
        }),
      }),
    }),
  },
  [ConditionSource.ITEM]: {
    template: group('Шаблон продукта', {
      name: field('Название', 'string'),
      defaultCharacteristics: group('Характеристики по умолчанию', {
        width: field('Ширина', 'number'),
        height: field('Высота', 'number'),
        thickness: field('Толщина', 'number'),
      }),
      customerPricingMethod: enumField(
        'Метод расчёта для заказчика',
        Object.values(CustomerPricingMethod),
      ),
      baseCustomerPrice: field('Базовая стоимость', 'number'),
      group: field('Группа', 'string'),
    }),
    quantity: field('Количество', 'number'),
    snapshot: group('Снимок', {
      name: field('Название', 'string'),
      baseCustomerPrice: field('Базовая цена для заказчика', 'number'),
      customerPricingMethod: enumField(
        'Метод расчёта для заказчика',
        Object.values(CustomerPricingMethod),
      ),
      defaultCharacteristics: group('Характеристики по умолчанию', {
        width: field('Ширина', 'number'),
        height: field('Высота', 'number'),
        thickness: field('Толщина', 'number'),
      }),
    }),
    characteristics: group('Характеристики', {
      width: field('Ширина', 'number'),
      height: field('Высота', 'number'),
      thickness: field('Толщина', 'number'),
    }),
  },
} as const satisfies PriceModifierConditionPathSchemas;

export const isConditionPathField = (
  node: ConditionPathNode,
): node is ConditionPathField => Object.hasOwn(node, 'type');

export const getPriceModifierConditionPathField = (
  source: ConditionSource,
  path: string,
): ConditionPathField | undefined => {
  const parts = path.split('.');
  let schema: ConditionPathSchema =
    PRICE_MODIFIER_CONDITION_PATH_SCHEMAS[source];

  for (const [index, part] of parts.entries()) {
    const node = schema[part];
    if (!node) return undefined;
    if (index === parts.length - 1) {
      return isConditionPathField(node) ? node : undefined;
    }
    if (isConditionPathField(node)) return undefined;
    schema = node.children;
  }

  return undefined;
};

export const isAllowedPriceModifierConditionPath = (
  source: ConditionSource,
  path: string,
): boolean => getPriceModifierConditionPathField(source, path) !== undefined;

export const isConditionOperatorAllowedForField = (
  field: ConditionPathField,
  operator: ConditionOperator,
): boolean => field.type === 'number' || operator === ConditionOperator.EQ;

export const isConditionValueValidForField = (
  field: ConditionPathField,
  value: unknown,
): boolean => {
  if (field.type === 'number') {
    return typeof value === 'number' && Number.isFinite(value);
  }
  if (typeof value !== 'string') return false;
  return field.type === 'string' || field.options.includes(value);
};
