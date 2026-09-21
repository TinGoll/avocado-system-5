import type { ProductionCard } from '@shared/api';

import { moveCardInSnapshot } from './production-board';

const card = (id: string, stageId: string) =>
  ({ id, stageId }) as ProductionCard;

describe('moveCardInSnapshot', () => {
  it('supports moving to an empty stage', () => {
    expect(
      moveCardInSnapshot(
        { first: [card('card', 'first')], empty: [] },
        'card',
        'empty',
        null,
      ),
    ).toEqual({ first: [], empty: [card('card', 'empty')] });
  });

  it('inserts before a server neighbor id', () => {
    const result = moveCardInSnapshot(
      { first: [card('card', 'first')], second: [card('neighbor', 'second')] },
      'card',
      'second',
      'neighbor',
    );
    expect(result.second.map(({ id }) => id)).toEqual(['card', 'neighbor']);
  });
});
