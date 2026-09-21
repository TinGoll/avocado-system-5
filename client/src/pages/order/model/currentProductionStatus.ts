import type { OrderProductionDocument } from '@shared/api';

export const getCurrentProductionStatus = (
  documents: OrderProductionDocument[],
) => {
  if (documents.length === 0) return 'Нет документов';
  if (documents.every(({ stageKind }) => stageKind === 'done')) {
    return 'Производство завершено';
  }

  const stageNames = [
    ...new Set(documents.map(({ stageName }) => stageName).filter(Boolean)),
  ];

  if (stageNames.length === 0) return 'Не назначено';
  if (stageNames.length === 1) return stageNames[0];
  return 'Несколько этапов';
};
