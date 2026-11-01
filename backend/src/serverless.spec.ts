import { toBackendUrl } from './serverless';

describe('toBackendUrl', () => {
  it('käyttää vercel.json-rewriten path-parametria', () => {
    expect(toBackendUrl('/api?path=pantry')).toBe('/pantry');
    expect(toBackendUrl('/api?path=pantry/123/consume')).toBe('/pantry/123/consume');
  });

  it('säilyttää alkuperäiset kyselyparametrit', () => {
    expect(toBackendUrl('/api?path=recipes&tag=kala&limit=5')).toBe('/recipes?tag=kala&limit=5');
  });

  it('poistaa /api-etuliitteen, jos path-parametria ei ole', () => {
    expect(toBackendUrl('/api/cron/daily-consumption')).toBe('/cron/daily-consumption');
    expect(toBackendUrl('/api')).toBe('/');
  });

  it('ei koske polkuun, joka vain alkaa merkkijonolla api', () => {
    expect(toBackendUrl('/apis')).toBe('/apis');
  });
});
