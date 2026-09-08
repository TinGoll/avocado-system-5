import type { ProductionCard } from '@shared/api';

export type StageCardsSnapshot = Record<string, ProductionCard[]>;

export const moveCardInSnapshot = (
  snapshot: StageCardsSnapshot,
  cardId: string,
  targetStageId: string,
  beforeCardId: string | null,
): StageCardsSnapshot => {
  const next = Object.fromEntries(
    Object.entries(snapshot).map(([stageId, cards]) => [stageId, [...cards]]),
  );
  let moved: ProductionCard | undefined;
  for (const cards of Object.values(next)) {
    const index = cards.findIndex(({ id }) => id === cardId);
    if (index >= 0) [moved] = cards.splice(index, 1);
  }
  if (!moved) return snapshot;
  const target = next[targetStageId] ?? [];
  const index = beforeCardId
    ? target.findIndex(({ id }) => id === beforeCardId)
    : target.length;
  target.splice(index < 0 ? target.length : index, 0, {
    ...moved,
    stageId: targetStageId,
  });
  next[targetStageId] = target;
  return next;
};
