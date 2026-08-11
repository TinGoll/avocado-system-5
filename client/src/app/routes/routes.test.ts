import { ROUTES } from './routes';

describe('application routes', () => {
  it('exposes the price modifiers page route', () => {
    expect(ROUTES.priceModifiers).toBe('/price-modifiers');
  });
});
