import { useEffect, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';

import { productionBoardKeys, type ProductionCard } from '@shared/api';
import { fetcher } from '@shared/lib/swr';

type CardsPage = {
  items: ProductionCard[];
  meta: { nextCursor: string | null };
};

export const useStageCards = (
  boardId: string,
  stageId: string,
  onChange: (stageId: string, cards: ProductionCard[]) => void,
) => {
  const result = useSWRInfinite<CardsPage>(
    (index, previous) => {
      if (previous && !previous.meta.nextCursor) return null;
      return productionBoardKeys.cards(
        boardId,
        stageId,
        index ? previous?.meta.nextCursor : null,
      );
    },
    (url: string) => fetcher<CardsPage>({ url }),
  );
  const cards = useMemo(
    () => result.data?.flatMap(({ items }) => items) ?? [],
    [result.data],
  );
  useEffect(() => onChange(stageId, cards), [cards, onChange, stageId]);
  return {
    ...result,
    cards,
    hasMore: Boolean(result.data?.at(-1)?.meta.nextCursor),
  };
};
