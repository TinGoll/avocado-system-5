import type { Workbook, Worksheet } from '@protobi/exceljs';

export type { Workbook, Worksheet };

export const createWorkbook = async (): Promise<Workbook> => {
  const { Workbook: WorkbookConstructor } = await import('@protobi/exceljs');

  return new WorkbookConstructor() as Workbook;
};
