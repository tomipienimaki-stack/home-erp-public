import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '../../..');
const cfg = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));

describe('vercel.json (yksi projekti)', () => {
  const crons: { path: string; schedule: string }[] = cfg.crons ?? [];
  const find = (p: string) => crons.find((c) => c.path === p);

  it('cronit osoittavat /api-polkuun', () => {
    expect(find('/api/cron/daily-consumption')?.schedule).toBe('0 3 * * *');
    expect(find('/api/cron/daily-threshold-check')?.schedule).toBe('0 4 * * *');
  });

  it('cronit ajetaan kerran päivässä ja kulutus ennen kynnystarkistusta', () => {
    expect(crons.length).toBe(2);
    for (const c of crons) {
      const [min, hour, dom, mon, dow] = c.schedule.split(' ');
      expect(min).toMatch(/^\d+$/);
      expect(hour).toMatch(/^\d+$/);
      expect([dom, mon, dow]).toEqual(['*', '*', '*']);
    }
    const hour = (p: string) => Number(find(p)!.schedule.split(' ')[1]);
    expect(hour('/api/cron/daily-consumption')).toBeLessThan(hour('/api/cron/daily-threshold-check'));
  });

  it('API-rewrite on ennen SPA-fallbackia ja vie polun path-parametrina', () => {
    const rewrites: { source: string; destination: string }[] = cfg.rewrites;
    const api = rewrites.findIndex((r) => r.source === '/api/:path*' && r.destination === '/api?path=:path*');
    const spa = rewrites.findIndex((r) => r.source === '/(.*)' && r.destination === '/index.html');
    expect(api).toBeGreaterThanOrEqual(0);
    expect(spa).toBeGreaterThan(api);
  });

  it('funktio lataa käännetyn serverless-käsittelijän', () => {
    expect(readFileSync(join(root, 'api/index.js'), 'utf8')).toContain('../backend/dist/serverless.js');
    expect(cfg.outputDirectory).toBe('frontend/dist');
    expect(cfg.buildCommand).toContain('--prefix backend');
  });

  it('erillisiä projektikohtaisia vercel.json-tiedostoja ei ole', () => {
    expect(existsSync(join(root, 'backend/vercel.json'))).toBe(false);
    expect(existsSync(join(root, 'frontend/vercel.json'))).toBe(false);
  });
});
