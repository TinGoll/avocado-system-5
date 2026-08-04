type MockEntity = Record<string, unknown> & { id: string | number };

const createdAt = '2026-08-01T09:00:00.000Z';
const updatedAt = createdAt;

const withDates = <T extends MockEntity>(entity: T) => ({
  ...entity,
  createdAt,
  updatedAt,
});

export const mockData: Record<string, MockEntity[]> = {
  customers: [
    {
      id: 'customer-1',
      name: 'Иван Петров',
      level: 'gold',
    },
    {
      id: 'customer-2',
      name: 'Анна Соколова',
      level: 'silver',
    },
    {
      id: 'customer-3',
      name: 'Михаил Орлов',
      level: 'bronze',
    },
  ],
  colors: [
    withDates({
      id: '11000000-0000-4000-8000-000000000001',
      name: 'Белая эмаль',
      type: 'enamel',
    }),
    withDates({
      id: '11000000-0000-4000-8000-000000000002',
      name: 'Орех',
      type: 'stain',
    }),
  ],
  materials: [
    withDates({
      id: '22000000-0000-4000-8000-000000000001',
      name: 'Дуб',
      type: 'hardwood',
    }),
    withDates({
      id: '22000000-0000-4000-8000-000000000002',
      name: 'МДФ',
      type: 'mdf',
    }),
  ],
  'facade-profiles': [
    withDates({
      id: '33000000-0000-4000-8000-000000000001',
      name: 'Классика',
      characteristics: {
        width: 70,
        grooveDepth: 8,
        grooveWidth: 6,
        style: 'classic',
      },
    }),
  ],
  panels: [
    withDates({
      id: '44000000-0000-4000-8000-000000000001',
      name: 'Гладкая филёнка',
      characteristics: { style: 'flat' },
    }),
  ],
  patinas: [
    withDates({ id: '55000000-0000-4000-8000-000000000001', name: 'Золото' }),
    withDates({ id: '55000000-0000-4000-8000-000000000002', name: 'Серебро' }),
  ],
  varnishes: [
    withDates({ id: '66000000-0000-4000-8000-000000000001', name: 'Матовый' }),
    withDates({
      id: '66000000-0000-4000-8000-000000000002',
      name: 'Глянцевый',
    }),
  ],
  'production-operations': [
    withDates({
      id: '77000000-0000-4000-8000-000000000001',
      name: 'Фрезеровка',
      calculationMethod: 'per_item',
      costPerUnit: 350,
    }),
    withDates({
      id: '77000000-0000-4000-8000-000000000002',
      name: 'Покраска',
      calculationMethod: 'area',
      costPerUnit: 1200,
    }),
  ],
  products: [
    withDates({
      id: '88000000-0000-4000-8000-000000000001',
      name: 'Фасад прямой',
      group: 'Фасады',
      defaultCharacteristics: { width: 600, height: 720, thickness: 20 },
      customerPricingMethod: 'area',
      baseCustomerPrice: 8500,
      attributes: {},
      operations: [],
    }),
    withDates({
      id: '88000000-0000-4000-8000-000000000002',
      name: 'Пилястра',
      group: 'Декор',
      defaultCharacteristics: { width: 100, height: 720, thickness: 30 },
      customerPricingMethod: 'per_item',
      baseCustomerPrice: 3200,
      attributes: {},
      operations: [],
    }),
  ],
  'price-modifiers': [
    withDates({
      id: '99000000-0000-4000-8000-000000000001',
      name: 'Срочный заказ',
      type: 'percentage',
      value: 20,
      conditions: {
        source: 'order_group',
        path: 'status',
        operator: 'eq',
        value: 'draft',
      },
      productTemplates: [],
    }),
  ],
  'order-groups': [
    withDates({
      id: 1,
      orderNumber: 'АВ-2026-001',
      customer: { id: 'customer-1', name: 'Иван Петров', level: 'gold' },
      status: 'draft',
      startedAt: '2026-08-01',
    }),
    withDates({
      id: 2,
      orderNumber: 'АВ-2026-002',
      customer: { id: 'customer-2', name: 'Анна Соколова', level: 'silver' },
      status: 'in_production',
      startedAt: '2026-08-03',
    }),
  ],
  orders: [
    withDates({
      id: 'aa000000-0000-4000-8000-000000000001',
      name: 'Документ 1',
      orderGroupId: 1,
      characteristics: {
        material: { name: 'Дуб', type: 'hardwood' },
        color: { name: 'Белая эмаль', type: 'enamel' },
      },
      totalPrice: 8500,
      items: [],
    }),
    withDates({
      id: 'aa000000-0000-4000-8000-000000000002',
      name: 'Фасады кухни',
      orderGroupId: 2,
      characteristics: {
        material: { name: 'Дуб', type: 'hardwood' },
        color: { name: 'Орех', type: 'stain' },
        profile: { name: 'Классика', characteristics: { width: 70 } },
        panel: { name: 'Гладкая филёнка', characteristics: { style: 'flat' } },
        varnish: { name: 'Матовый' },
      },
      totalPrice: 42800,
      items: [
        {
          id: 'ab000000-0000-4000-8000-000000000001',
          quantity: 8,
          calculatedCustomerPrice: 33600,
        },
        {
          id: 'ab000000-0000-4000-8000-000000000002',
          quantity: 4,
          calculatedCustomerPrice: 9200,
        },
      ],
    }),
    withDates({
      id: 'aa000000-0000-4000-8000-000000000003',
      name: 'Декоративные элементы',
      orderGroupId: 2,
      characteristics: {
        material: { name: 'МДФ', type: 'mdf' },
        color: { name: 'Белая эмаль', type: 'enamel' },
        patina: { name: 'Серебро' },
        varnish: { name: 'Глянцевый' },
      },
      totalPrice: 15600,
      items: [
        {
          id: 'ab000000-0000-4000-8000-000000000003',
          quantity: 6,
          calculatedCustomerPrice: 15600,
        },
      ],
    }),
    withDates({
      id: 'aa000000-0000-4000-8000-000000000004',
      name: 'Пилястры',
      orderGroupId: 2,
      characteristics: {
        material: { name: 'Дуб', type: 'hardwood' },
        color: { name: 'Орех', type: 'stain' },
        patina: { name: 'Золото' },
      },
      totalPrice: 12800,
      items: [
        {
          id: 'ab000000-0000-4000-8000-000000000004',
          quantity: 4,
          calculatedCustomerPrice: 12800,
        },
      ],
    }),
  ],
};

export type { MockEntity };
