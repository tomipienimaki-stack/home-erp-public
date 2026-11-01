import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '../../..');
const readme = readFileSync(join(root, 'README.md'), 'utf8');

describe('dokumentaatio', () => {
  it('Deploy-nappi pyytää Supabase-integraation eikä vaadi muuttujia', () => {
    const url = readme.match(/\(https:\/\/vercel\.com\/new\/clone\?([^)]+)\)/)![1];
    const params = new URLSearchParams(url);
    expect(params.get('env')).toBeNull();
    expect(JSON.parse(params.get('stores')!)).toEqual([
      expect.objectContaining({ type: 'integration', integrationSlug: 'supabase' }),
    ]);
  });

  it('README dokumentoi valinnaiset ja käsiasennuksen muuttujat', () => {
    for (const name of [
      'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SINGLE_USER_ID',
      'CRON_SECRET', 'ANTHROPIC_API_KEY', 'HOME_ERP_API_TOKEN', 'POSTGRES_URL',
    ]) {
      expect(readme).toContain(name);
    }
  });

  it('README ohjaa ajamaan schema.sql-tiedoston', () => {
    expect(readme).toContain('supabase/schema.sql');
  });

  it('MCP:n virheviesti ei käske käynnistämään backendia', () => {
    const src = readFileSync(join(root, 'mcp/src/index.ts'), 'utf8');
    expect(src).toContain('Home ERP -palveluun ei saada yhteyttä (');
  });
});

describe('supabase/schema.sql', () => {
  it('on ajan tasalla migraatioiden kanssa (aja scripts/build-schema.sh)', () => {
    const { readdirSync } = require('fs');
    const schema = readFileSync(join(root, 'supabase/schema.sql'), 'utf8');
    const dir = join(root, 'supabase/migrations');
    for (const f of readdirSync(dir).filter((n: string) => n.endsWith('.sql'))) {
      expect(schema).toContain(readFileSync(join(dir, f), 'utf8'));
    }
  });
});
