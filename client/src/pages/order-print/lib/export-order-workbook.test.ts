import { Workbook } from '@protobi/exceljs';

import type { Order, OrderGroup } from '@entities/order';

import type { ProductionOrderDocument } from '../model/production-order';

import {
  buildOrderWorkbook,
  normalizeWorksheetName,
} from './export-order-workbook';

describe('order workbook export', () => {
  it('normalizes duplicate and invalid worksheet names', () => {
    const usedNames = new Set<string>();

    expect(normalizeWorksheetName('Распил/фасадов*', usedNames)).toBe(
      'Распил фасадов',
    );
    expect(normalizeWorksheetName('Распил/фасадов*', usedNames)).toBe(
      'Распил фасадов (2)',
    );
  });

  it('creates only the selected production worksheet with numeric values', () => {
    const group = {
      id: '42',
      orderNumber: 'A-100',
      startedAt: '2026-09-01',
      customer: { name: 'Заказчик' },
    } as unknown as OrderGroup;
    const order = {
      id: 'order-1',
      documentNumber: 1,
      characteristics: {},
      items: [],
    } as unknown as Order;
    const productionDocuments: ProductionOrderDocument[] = [
      {
        operationId: 'operation-1',
        operationName: 'Распил',
        sheets: [
          {
            order,
            documentIndex: 0,
            rows: [
              {
                key: 'row-1',
                renderedName: 'Фасад',
                unit: 'per_item',
                calculatedQuantity: 2,
                costPerUnit: 100,
                totalCost: 200,
              },
            ],
          },
        ],
      },
    ];

    const workbook = buildOrderWorkbook(new Workbook(), {
      group,
      orders: [order],
      selectedDocument: {
        type: 'production',
        name: productionDocuments[0].operationName,
        document: productionDocuments[0],
      },
    });

    expect(workbook.worksheets.map(({ name }) => name)).toEqual(['Распил']);

    const productionWorksheet = workbook.getWorksheet('Распил');
    const itemRow = productionWorksheet?.findRow(4);

    expect(itemRow?.getCell(6).value).toBe(2);
    expect(itemRow?.getCell(8).value).toBe(200);
  });

  it('creates only the selected customer worksheet', () => {
    const group = {
      id: '42',
      orderNumber: 'A-100',
      startedAt: '2026-09-01',
      customer: { name: 'Заказчик' },
    } as unknown as OrderGroup;
    const order = {
      id: 'order-1',
      documentNumber: 1,
      characteristics: {},
      items: [],
    } as unknown as Order;

    const workbook = buildOrderWorkbook(new Workbook(), {
      group,
      orders: [order],
      selectedDocument: {
        type: 'customer',
        name: 'Бланк для заказчика',
        showPrices: true,
      },
    });

    expect(workbook.worksheets.map(({ name }) => name)).toEqual([
      'Бланк для заказчика',
    ]);
  });
});
