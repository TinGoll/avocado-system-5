import type { Order } from '@entities/order';

export type ProductionOrderRow = {
  key: string;
  renderedName: string;
  unit: string;
  sourceQuantity: number;
  calculatedQuantity: number;
  totalCost: number;
};

export type ProductionOrderDocument = {
  operationId: string;
  operationName: string;
  rows: ProductionOrderRow[];
};

const normalizeRenderedName = (name: string): string =>
  name.normalize('NFKC').trim().replace(/\s+/g, ' ');

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const buildProductionOrderDocuments = (
  orders: Order[],
): ProductionOrderDocument[] => {
  const documents = new Map<
    string,
    ProductionOrderDocument & { rowsByKey: Map<string, ProductionOrderRow> }
  >();

  orders.forEach((order) =>
    order.items.forEach((item) =>
      item.productionOperationResults.forEach((result) => {
        const normalizedName = normalizeRenderedName(result.renderedName);
        const rowKey = [
          result.operationId,
          normalizedName,
          result.calculationMethod,
        ].join('\u0000');
        let document = documents.get(result.operationId);

        if (!document) {
          document = {
            operationId: result.operationId,
            operationName: result.originalName,
            rows: [],
            rowsByKey: new Map(),
          };
          documents.set(result.operationId, document);
        }

        const row = document.rowsByKey.get(rowKey);

        if (row) {
          row.sourceQuantity += item.quantity;
          row.calculatedQuantity += result.calculatedQuantity;
          row.totalCost += result.totalCost;
        } else {
          document.rowsByKey.set(rowKey, {
            key: rowKey,
            renderedName: normalizedName,
            unit: result.calculationMethod,
            sourceQuantity: item.quantity,
            calculatedQuantity: result.calculatedQuantity,
            totalCost: result.totalCost,
          });
        }
      }),
    ),
  );

  return [...documents.values()].map(({ rowsByKey, ...document }) => ({
    ...document,
    rows: [...rowsByKey.values()].map((row) => ({
      ...row,
      totalCost: roundMoney(row.totalCost),
    })),
  }));
};
