import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports that the server is ready', () => {
    expect(new HealthController().check()).toEqual({ status: 'ok' });
  });
});
