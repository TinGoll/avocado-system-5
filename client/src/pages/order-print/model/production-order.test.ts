import { describe, expect, it } from 'vitest';

import type { Order } from '@entities/order';

import { buildProductionOrderDocuments } from './production-order';

const makeOrder = (
  items: Partial<Order['items'][number]>[],
  id = 'order-1',
): Order =>
  ({
    id,
    items: items.map((item) => ({ characteristics: {}, ...item })),
  }) as Order;

const result = (
  renderedName: string,
  calculatedQuantity: number,
  totalCost: number,
) => ({
  operationId: 'operation-1',
  originalName: 'Филёнка',
  calculationFormula: 'item.quantity',
  displayNameTemplate: renderedName,
  calculationMethod: 'area' as const,
  costPerUnit: 100,
  calculatedQuantity,
  renderedName,
  totalCost,
});

describe('buildProductionOrderDocuments', () => {
  it('merges equal normalized rows and rounds money after summation', () => {
    const documents = buildProductionOrderDocuments([
      makeOrder([
        {
          quantity: 2,
          characteristics: { height: 780, width: 420, thickness: 19 },
          productionOperationResults: [
            result(' Филёнка: 780х420 ', 0.66, 10.005),
          ],
        },
        {
          quantity: 3,
          characteristics: { height: 780, width: 420, thickness: 19 },
          productionOperationResults: [
            result('Филёнка:   780х420', 0.99, 10.005),
          ],
        },
      ]),
    ]);

    expect(documents[0].sheets[0].rows).toEqual([
      expect.objectContaining({
        renderedName: 'Филёнка: 780х420',
        height: 780,
        width: 420,
        thickness: 19,
        calculatedQuantity: 1.65,
        costPerUnit: 100,
        totalCost: 20.01,
      }),
    ]);
  });

  it('keeps different rendered geometry in separate rows', () => {
    const documents = buildProductionOrderDocuments([
      makeOrder([
        {
          quantity: 1,
          productionOperationResults: [result('Филёнка: 780х420', 1, 100)],
        },
        {
          quantity: 1,
          productionOperationResults: [result('Филёнка: 700х420', 1, 100)],
        },
      ]),
    ]);

    expect(documents[0].sheets[0].rows).toHaveLength(2);
  });

  it('creates a separate sheet for each order document', () => {
    const documents = buildProductionOrderDocuments([
      makeOrder(
        [
          {
            quantity: 1,
            productionOperationResults: [result('Филёнка: 780х420', 1, 100)],
          },
        ],
        'order-1',
      ),
      makeOrder(
        [
          {
            quantity: 1,
            productionOperationResults: [result('Филёнка: 780х420', 1, 100)],
          },
        ],
        'order-2',
      ),
    ]);

    expect(documents).toHaveLength(1);
    expect(documents[0].sheets.map(({ order }) => order.id)).toEqual([
      'order-1',
      'order-2',
    ]);
  });

  it('uses calculated operation dimensions instead of source dimensions', () => {
    const operationResult = {
      ...result('Филёнка: 726х206', 0.74778, 515.22),
      calculatedHeight: 726,
      calculatedWidth: 206,
      calculatedThickness: null,
    };
    const documents = buildProductionOrderDocuments([
      makeOrder([
        {
          quantity: 5,
          characteristics: { height: 916, width: 396, thickness: 21 },
          productionOperationResults: [operationResult],
        },
      ]),
    ]);

    expect(documents[0].sheets[0].rows[0]).toEqual(
      expect.objectContaining({
        height: 726,
        width: 206,
        thickness: undefined,
      }),
    );
  });
});
