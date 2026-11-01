// eslint-disable-next-line @typescript-eslint/no-var-requires
const { clientConfig, connectionString } = require('../scripts/migrate.js');

describe('scripts/migrate.js', () => {
  it('valitsee yhteysosoitteen Vercelin Supabase-integraation muuttujista', () => {
    expect(connectionString({ POSTGRES_URL: 'a', POSTGRES_URL_NON_POOLING: 'b' })).toBe('b');
    expect(connectionString({ DATABASE_URL: 'c' })).toBe('c');
    expect(connectionString({})).toBeUndefined();
  });

  it('käyttää TLS:ää etäkantaan ja poistaa sslmode-parametrin', () => {
    const cfg = clientConfig('postgres://u:p@db.abc.supabase.co:5432/postgres?sslmode=require&supa=base-pooler.x');
    expect(cfg.ssl).toEqual({ rejectUnauthorized: false });
    expect(cfg.connectionString).toBe('postgres://u:p@db.abc.supabase.co:5432/postgres');
  });

  it('ei käytä TLS:ää paikalliseen kantaan', () => {
    expect(clientConfig('postgres://postgres@localhost:5432/t').ssl).toBe(false);
  });
});
