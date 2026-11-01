import { IS_PUBLIC } from './public.decorator';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('REQ-M01-6: GET /health returns { ok: true }', () => {
    expect(new HealthController().check()).toEqual({ ok: true });
  });

  it('REQ-M01-6: GET /health is @Public()', () => {
    expect(Reflect.getMetadata(IS_PUBLIC, HealthController.prototype.check)).toBe(true);
  });
});
