/**
 * Ympäristömuuttujat useilla nimillä. Vercelin Supabase-integraatio käyttää
 * Next.js-tyylisiä nimiä (NEXT_PUBLIC_*), uudet Supabase-projektit
 * "publishable"- ja "secret"-avaimia, käsin asennetut tämän README:n nimiä.
 */
type Env = Record<string, string | undefined>;

const first = (env: Env, names: string[]): string | undefined =>
  names.map((n) => env[n]?.trim()).find((v) => !!v);

export const SUPABASE_URL_VARS = ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL'];
export const SUPABASE_SERVICE_KEY_VARS = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'];
export const SUPABASE_PUBLIC_KEY_VARS = [
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
];
export const DATABASE_URL_VARS = ['POSTGRES_URL_NON_POOLING', 'POSTGRES_URL', 'DATABASE_URL'];

/**
 * Omistajan käyttäjätunniste, kun SINGLE_USER_ID puuttuu. Jokainen asennus on
 * oma tietokantansa, joten kiinteä arvo on turvallinen: sovelluksen
 * ensimmäinen käyttöönotto luo tällä tunnisteella omistajan (POST /setup).
 */
export const DEFAULT_OWNER_ID = '00000000-0000-4000-8000-000000000001';

export const supabaseUrl = (env: Env = process.env) => first(env, SUPABASE_URL_VARS);
export const supabaseServiceKey = (env: Env = process.env) => first(env, SUPABASE_SERVICE_KEY_VARS);
export const databaseUrl = (env: Env = process.env) => first(env, DATABASE_URL_VARS);
export const ownerId = (env: Env = process.env) => first(env, ['SINGLE_USER_ID']) ?? DEFAULT_OWNER_ID;
