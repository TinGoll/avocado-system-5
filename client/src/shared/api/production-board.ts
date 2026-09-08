import { fetcher } from '@shared/lib/swr';

export type ProductionStageKind = 'queue' | 'active' | 'done';
export type ProductionStage = {
  id: string;
  boardId: string;
  name: string;
  color: string;
  kind: ProductionStageKind;
  progressPercent: number;
  position: number;
  usedAt: string | null;
  archivedAt: string | null;
};
export type ProductionBoard = {
  id: string;
  name: string;
  description: string | null;
  initialStageId: string;
  version: number;
  archivedAt: string | null;
  stages?: ProductionStage[];
};
export type ProductionCard = {
  id: string;
  orderId: string;
  stageId: string;
  position: number;
  progressPercent: number;
  enteredStageAt: string;
  version: number;
  documentName: string | null;
  documentNumber: number;
  documentVersion: number;
  effectiveDueDate: string | null;
  customStatusId: string | null;
  customStatusName: string | null;
  customStatusColor: string | null;
  orderGroupId: number;
  orderNumber: string;
  groupVersion: number;
};
export type StageDefinition = Pick<
  ProductionStage,
  'name' | 'color' | 'kind' | 'progressPercent'
>;

export const productionBoardKeys = {
  list: 'production-boards',
  board: (id: string) => `production-boards/${id}`,
  cards: (id: string, stageId: string, cursor?: string | null) =>
    `production-boards/${id}/cards?stageId=${stageId}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
};

export const getProductionBoards = () =>
  fetcher<{ items: ProductionBoard[]; meta: { count: number } }>({
    url: productionBoardKeys.list,
  });
export const getProductionBoard = (id: string) =>
  fetcher<ProductionBoard>({ url: productionBoardKeys.board(id) });
export const createProductionBoard = (data: {
  name: string;
  description?: string | null;
  stages: StageDefinition[];
  initialStageIndex: number;
}) =>
  fetcher<ProductionBoard, typeof data>({
    url: productionBoardKeys.list,
    method: 'POST',
    data,
  });
export const updateProductionBoard = (
  id: string,
  data: {
    expectedVersion: number;
    name?: string;
    description?: string | null;
    initialStageId?: string;
  },
) =>
  fetcher<ProductionBoard, typeof data>({
    url: productionBoardKeys.board(id),
    method: 'PATCH',
    data,
  });
export const archiveProductionBoard = (id: string, expectedVersion: number) =>
  fetcher<ProductionBoard, { expectedVersion: number }>({
    url: `${productionBoardKeys.board(id)}/archive`,
    method: 'POST',
    data: { expectedVersion },
  });
export const addProductionStage = (
  boardId: string,
  data: StageDefinition & { expectedVersion: number },
) =>
  fetcher<ProductionBoard, typeof data>({
    url: `${productionBoardKeys.board(boardId)}/stages`,
    method: 'POST',
    data,
  });
export const updateProductionStage = (
  boardId: string,
  stageId: string,
  data: Partial<StageDefinition> & { expectedVersion: number },
) =>
  fetcher<ProductionBoard, typeof data>({
    url: `${productionBoardKeys.board(boardId)}/stages/${stageId}`,
    method: 'PATCH',
    data,
  });
export const archiveProductionStage = (
  boardId: string,
  stageId: string,
  data: { expectedVersion: number; initialStageId?: string },
) =>
  fetcher<ProductionBoard, typeof data>({
    url: `${productionBoardKeys.board(boardId)}/stages/${stageId}/archive`,
    method: 'POST',
    data,
  });
export const deleteProductionStage = (
  boardId: string,
  stageId: string,
  data: { expectedVersion: number; initialStageId?: string },
) =>
  fetcher<ProductionBoard, typeof data>({
    url: `${productionBoardKeys.board(boardId)}/stages/${stageId}`,
    method: 'DELETE',
    data,
  });
export const reorderProductionStages = (
  boardId: string,
  expectedVersion: number,
  stageIds: string[],
) =>
  fetcher<ProductionBoard, { expectedVersion: number; stageIds: string[] }>({
    url: `${productionBoardKeys.board(boardId)}/stage-order`,
    method: 'PUT',
    data: { expectedVersion, stageIds },
  });
export const assignProductionCard = (
  boardId: string,
  data: {
    orderId: string;
    expectedBoardVersion: number;
    expectedGroupVersion: number;
  },
) =>
  fetcher({
    url: `${productionBoardKeys.board(boardId)}/cards`,
    method: 'POST',
    data,
  });
export const moveProductionCard = (
  cardId: string,
  data: {
    targetStageId: string;
    beforeCardId?: string | null;
    expectedCardVersion: number;
    expectedBoardVersion: number;
    expectedGroupVersion: number;
  },
) => fetcher({ url: `production-cards/${cardId}/move`, method: 'POST', data });
export const transferProductionCard = (
  cardId: string,
  data: Parameters<typeof moveProductionCard>[1] & {
    targetBoardId: string;
    expectedTargetBoardVersion: number;
  },
) =>
  fetcher({ url: `production-cards/${cardId}/transfer`, method: 'POST', data });
