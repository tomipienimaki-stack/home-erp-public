import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Vercelissä frontend ja backend ovat samassa projektissa, joten käyttäjä
 * asettaa Supabasen osoitteen ja anon-avaimen vain kerran ilman VITE_-etuliitettä.
 * Vain nämä kaksi julkista arvoa viedään selaimeen. Palveluavain ei koskaan.
 */
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const pick = (...names: string[]) => names.map((n) => env[n]).find((v) => v);
  const supabaseUrl = pick('VITE_SUPABASE_URL', 'SUPABASE_URL');
  const supabaseAnonKey = pick('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      ...(supabaseUrl && { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl) }),
      ...(supabaseAnonKey && {
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      }),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3003',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  };
});
