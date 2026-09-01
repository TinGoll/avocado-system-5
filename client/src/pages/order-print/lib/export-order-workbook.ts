import dayjs from 'dayjs';

import type { Order, OrderGroup } from '@entities/order';

import {
  buildCustomerOrderRows,
  buildCustomerOrderTotals,
} from '../model/customer-order';
import type { ProductionOrderDocument } from '../model/production-order';

import { createWorkbook, type Workbook, type Worksheet } from './exceljs';

type ExportOrderWorkbookOptions = {
  group: OrderGroup;
  orders: Order[];
  productionDocuments: ProductionOrderDocument[];
};

const border = {
  top: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
  left: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
  right: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
};

const unitLabels: Record<string, string> = {
  per_item: 'шт.',
  linear_meter: 'м',
  area: 'м²',
  volume: 'м³',
};

const characteristicLabels = [
  ['profile', 'Модель фасада'],
  ['material', 'Материал'],
  ['color', 'Цвет'],
  ['patina', 'Патина'],
  ['varnish', 'Лак'],
  ['panel', 'Филёнка'],
] as const;

const prepareWorksheet = (worksheet: Worksheet): void => {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };
};

const styleTitle = (worksheet: Worksheet, title: string): void => {
  const row = worksheet.addRow([title]);
  worksheet.mergeCells(row.number, 1, row.number, 8);
  row.height = 24;
  row.getCell(1).font = { bold: true, size: 14 };
  row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
};

const styleTableHeader = (worksheet: Worksheet, values: string[]): void => {
  const row = worksheet.addRow(values);
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' },
    };
    cell.border = border;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
};

const addOrderMetadata = (
  worksheet: Worksheet,
  group: OrderGroup,
  order: Order,
): void => {
  worksheet.addRow([
    'Заказ',
    `№ ${group.id}/${order.documentNumber}`,
    'Номер заказа',
    group.orderNumber ?? '',
    'Заказчик',
    group.customer?.name ?? '',
    'Дата',
    dayjs(group.startedAt).format('DD.MM.YYYY'),
  ]);

  const characteristics = characteristicLabels.flatMap(([key, label]) => {
    const value = order.characteristics[key];
    return value === undefined ? [] : [label, value?.name ?? '-'];
  });

  if (characteristics.length) worksheet.addRow(characteristics);

  const comments = [group.comment, order.comment].filter(Boolean).join('\n');
  if (comments) worksheet.addRow(['Комментарий', comments]);
};

const addCustomerWorksheet = (
  workbook: Workbook,
  group: OrderGroup,
  orders: Order[],
): void => {
  const worksheet = workbook.addWorksheet('Для заказчика');
  prepareWorksheet(worksheet);
  worksheet.columns = [
    { width: 7 },
    { width: 38 },
    { width: 16 },
    { width: 12 },
    { width: 14 },
    { width: 16 },
    { width: 32 },
    { width: 16 },
  ];

  orders.forEach((order, orderIndex) => {
    if (orderIndex > 0) worksheet.addRow([]);
    styleTitle(
      worksheet,
      `Бланк для заказчика № ${group.id}/${order.documentNumber}`,
    );
    addOrderMetadata(worksheet, group, order);
    styleTableHeader(worksheet, [
      '№',
      'Название',
      'Кол-во',
      'Ед.',
      'Цена, ₽',
      'Сумма, ₽',
      'Комментарий',
    ]);

    buildCustomerOrderRows(order).forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,
        item.dimensions,
        item.calculatedQuantity,
        item.unit,
        item.unitPrice,
        item.totalPrice,
        item.comment,
      ]);
      row.eachCell((cell) => {
        cell.border = border;
        cell.alignment = { vertical: 'top', wrapText: true };
      });
      row.getCell(3).numFmt = '#,##0.###';
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';
    });

    const totals = buildCustomerOrderTotals(order);
    totals.groups.forEach(({ group: totalGroup, amount }) => {
      const row = worksheet.addRow(['', '', '', '', totalGroup, amount]);
      row.getCell(6).numFmt = '#,##0.00';
    });
    const totalRow = worksheet.addRow(['', '', '', '', 'Итого', totals.total]);
    totalRow.font = { bold: true };
    totalRow.getCell(6).numFmt = '#,##0.00';
  });
};

export const normalizeWorksheetName = (
  name: string,
  usedNames: Set<string>,
): string => {
  const baseName =
    name
      .replace(/[\\/*?:[\]]/g, ' ')
      .trim()
      .slice(0, 31) || 'Лист';
  let result = baseName;
  let suffix = 2;

  while (usedNames.has(result.toLocaleLowerCase('ru-RU'))) {
    const marker = ` (${suffix})`;
    result = `${baseName.slice(0, 31 - marker.length)}${marker}`;
    suffix += 1;
  }

  usedNames.add(result.toLocaleLowerCase('ru-RU'));
  return result;
};

const addProductionWorksheet = (
  workbook: Workbook,
  group: OrderGroup,
  document: ProductionOrderDocument,
  worksheetName: string,
): void => {
  const worksheet = workbook.addWorksheet(worksheetName);
  prepareWorksheet(worksheet);
  worksheet.columns = [
    { width: 7 },
    { width: 38 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  document.sheets.forEach(({ order, rows }, sheetIndex) => {
    if (sheetIndex > 0) worksheet.addRow([]);
    styleTitle(worksheet, `Бланк-наряд: ${document.operationName}`);
    addOrderMetadata(worksheet, group, order);
    styleTableHeader(worksheet, [
      '№',
      'Название',
      'Высота',
      'Ширина',
      'Толщина',
      'Кол-во',
      'Стоимость, ₽',
      'Сумма, ₽',
    ]);

    rows.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,
        item.renderedName,
        item.height ?? '-',
        item.width ?? '-',
        item.thickness ?? '-',
        item.calculatedQuantity,
        item.costPerUnit,
        item.totalCost,
      ]);
      row.eachCell((cell) => {
        cell.border = border;
        cell.alignment = { vertical: 'top', wrapText: true };
      });
      row.getCell(7).numFmt = '#,##0.00';
      row.getCell(8).numFmt = '#,##0.00';
      row.getCell(6).numFmt =
        `#,##0.### "${unitLabels[item.unit] ?? item.unit}"`;
    });

    const total = rows.reduce((sum, row) => sum + row.totalCost, 0);
    const totalRow = worksheet.addRow(['', '', '', '', '', '', 'Итого', total]);
    totalRow.font = { bold: true };
    totalRow.getCell(8).numFmt = '#,##0.00';
  });
};

export const buildOrderWorkbook = (
  workbook: Workbook,
  { group, orders, productionDocuments }: ExportOrderWorkbookOptions,
): Workbook => {
  workbook.creator = 'Avocado';
  workbook.created = new Date();
  addCustomerWorksheet(workbook, group, orders);

  const usedNames = new Set(['для заказчика']);
  productionDocuments.forEach((document) => {
    addProductionWorksheet(
      workbook,
      group,
      document,
      normalizeWorksheetName(document.operationName, usedNames),
    );
  });

  return workbook;
};

export const exportOrderWorkbook = async (
  options: ExportOrderWorkbookOptions,
): Promise<void> => {
  const workbook = buildOrderWorkbook(await createWorkbook(), options);
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `order-${options.group.id}.xlsx`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
