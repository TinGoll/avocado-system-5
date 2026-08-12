import { buildCatalogInlineUpdate } from './catalog-update';

describe('buildCatalogInlineUpdate', () => {
  it('builds a root field patch', () => {
    expect(
      buildCatalogInlineUpdate(
        { id: 'material-1', name: 'Дуб' },
        ['name'],
        'Ясень',
      ),
    ).toEqual({ name: 'Ясень' });
  });

  it('preserves adjacent nested characteristics', () => {
    const profile = {
      id: 'profile-1',
      characteristics: {
        width: 60,
        grooveDepth: 8,
        style: 'Классика',
      },
    };

    expect(
      buildCatalogInlineUpdate(profile, ['characteristics', 'grooveDepth'], 10),
    ).toEqual({
      characteristics: {
        width: 60,
        grooveDepth: 10,
        style: 'Классика',
      },
    });
    expect(profile.characteristics.grooveDepth).toBe(8);
  });
});
