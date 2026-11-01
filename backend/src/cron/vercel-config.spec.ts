import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '../../..');
const cfg = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));

describe('vercel.json (yksi projekti)', () => {
  it('build ajaa migraatiot ennen käännöstä', () => {
    expect(cfg.buildCommand).toMatch(/^node backend\/scripts\/migrate\.js && /);
    expect(cfg.buildCommand).toContain('--prefix backend');
    expect(cfg.outputDirectory).toBe('frontend/dist');
  });

  it('ei vaadi ajastettuja ajoja (päivän ajot käynnistyvät käytöstä)', () => {
    expect(cfg.crons).toBeUndefined();
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
  });

  it('erillisiä projektikohtaisia vercel.json-tiedostoja ei ole', () => {
    expect(existsSync(join(root, 'backend/vercel.json'))).toBe(false);
    expect(existsSync(join(root, 'frontend/vercel.json'))).toBe(false);
  });
});
