import { describe, expect, it } from 'vitest';

import type { Order } from '@entities/order';

import { buildProductionOrderDocuments } from './production-order';

const makeOrder = (items: Partial<Order['items'][number]>[]): Order =>
  ({ items }) as Order;

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
          productionOperationResults: [
            result(' Филёнка: 780х420 ', 0.66, 10.005),
          ],
        },
        {
          quantity: 3,
          productionOperationResults: [
            result('Филёнка:   780х420', 0.99, 10.005),
          ],
        },
      ]),
    ]);

    expect(documents[0].rows).toEqual([
      expect.objectContaining({
        renderedName: 'Филёнка: 780х420',
        sourceQuantity: 5,
        calculatedQuantity: 1.65,
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

    expect(documents[0].rows).toHaveLength(2);
  });
});
