import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('project configuration', () => {
  it('REQ-M01-1: backend and frontend package.json have a test script', () => {
    expect(JSON.parse(read('backend/package.json')).scripts.test).toBeTruthy();
    expect(JSON.parse(read('frontend/package.json')).scripts.test).toBe('vitest run');
  });

  it('CI workflow runs the tests', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toContain('cd backend && npm ci && npx tsc --noEmit -p tsconfig.json && npm test');
    expect(ci).toContain('cd frontend && npm ci && npx tsc -b && npm test');
  });

  it('REQ-M01-13: backend .env.example lists the new variables, AUTH_DISABLED defaulting to false', () => {
    const env = read('backend/.env.example');
    expect(env).toContain('HOME_ERP_API_TOKEN');
    expect(env).toMatch(/^AUTH_DISABLED=false$/m);
    expect(env).toMatch(/production/i);
  });

  it('REQ-M01-13: frontend .env.example lists the new variables', () => {
    const env = read('frontend/.env.example');
    for (const v of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_AUTH_DISABLED']) {
      expect(env).toContain(v);
    }
  });
});
