import { productionBoardKeys } from './production-board';

describe('productionBoardKeys', () => {
  it('uses the server default page size because limit query strings are rejected', () => {
    expect(productionBoardKeys.cards('board-id', 'stage-id')).toBe(
      'production-boards/board-id/cards?stageId=stage-id',
    );
  });

  it('keeps cursor pagination without adding a limit', () => {
    expect(productionBoardKeys.cards('board-id', 'stage-id', 'next/page')).toBe(
      'production-boards/board-id/cards?stageId=stage-id&cursor=next%2Fpage',
    );
  });
});
