/// <reference types="vite/client" />
import { useEffect, useState } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';

// Only the public anon key and URL belong in the frontend bundle.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'anon-key-not-set';

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Local development bypass: VITE_AUTH_DISABLED=true skips the login. */
export function authDisabled(): boolean {
  return import.meta.env.VITE_AUTH_DISABLED === 'true';
}

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
