import { ROUTES } from './routes';

describe('application routes', () => {
  it('exposes the price modifiers page route', () => {
    expect(ROUTES.priceModifiers).toBe('/price-modifiers');
  });

  it('exposes a dedicated route for every catalog', () => {
    expect([
      ROUTES.customers,
      ROUTES.materials,
      ROUTES.colors,
      ROUTES.facadePanels,
      ROUTES.facadeProfiles,
      ROUTES.patinas,
      ROUTES.varnishes,
      ROUTES.productionOperations,
      ROUTES.products,
    ]).toEqual([
      '/customers',
      '/materials',
      '/colors',
      '/facade-panels',
      '/facade-profiles',
      '/patinas',
      '/varnishes',
      '/production-operations',
      '/products',
    ]);
  });
});
