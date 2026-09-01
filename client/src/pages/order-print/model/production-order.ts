import type { Order } from '@entities/order';

export type ProductionOrderRow = {
  key: string;
  renderedName: string;
  height?: number;
  width?: number;
  thickness?: number;
  unit: string;
  calculatedQuantity: number;
  costPerUnit: number;
  totalCost: number;
};

export type ProductionOrderSheet = {
  order: Order;
  documentIndex: number;
  rows: ProductionOrderRow[];
};

export type ProductionOrderDocument = {
  operationId: string;
  operationName: string;
  sheets: ProductionOrderSheet[];
};

const normalizeRenderedName = (name: string): string =>
  name.normalize('NFKC').trim().replace(/\s+/g, ' ');

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const buildProductionOrderDocuments = (
  orders: Order[],
): ProductionOrderDocument[] => {
  const documents = new Map<string, ProductionOrderDocument>();

  orders.forEach((order, documentIndex) => {
    const sheets = new Map<
      string,
      { operationName: string; rowsByKey: Map<string, ProductionOrderRow> }
    >();

    order.items.forEach((item) =>
      item.productionOperationResults.forEach((result) => {
        const normalizedName = normalizeRenderedName(result.renderedName);
        const height = result.calculatedHeight ?? item.characteristics.height;
        const width = result.calculatedWidth ?? item.characteristics.width;
        const thickness =
          result.calculatedThickness === undefined
            ? item.characteristics.thickness
            : (result.calculatedThickness ?? undefined);
        const rowKey = [
          normalizedName,
          height,
          width,
          thickness,
          result.calculationMethod,
          result.costPerUnit,
        ].join('\u0000');
        let sheet = sheets.get(result.operationId);

        if (!sheet) {
          sheet = {
            operationName: result.originalName,
            rowsByKey: new Map(),
          };
          sheets.set(result.operationId, sheet);
        }

        const row = sheet.rowsByKey.get(rowKey);

        if (row) {
          row.calculatedQuantity += result.calculatedQuantity;
          row.totalCost += result.totalCost;
        } else {
          sheet.rowsByKey.set(rowKey, {
            key: rowKey,
            renderedName: normalizedName,
            height,
            width,
            thickness,
            unit: result.calculationMethod,
            calculatedQuantity: result.calculatedQuantity,
            costPerUnit: result.costPerUnit,
            totalCost: result.totalCost,
          });
        }
      }),
    );

    sheets.forEach(({ operationName, rowsByKey }, operationId) => {
      let document = documents.get(operationId);

      if (!document) {
        document = { operationId, operationName, sheets: [] };
        documents.set(operationId, document);
      }

      document.sheets.push({
        order,
        documentIndex,
        rows: [...rowsByKey.values()].map((row) => ({
          ...row,
          totalCost: roundMoney(row.totalCost),
        })),
      });
    });
  });

  return [...documents.values()];
};
