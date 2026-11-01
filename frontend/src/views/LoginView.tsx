import { useState, type FormEvent } from 'react';
import { Home } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(
          /invalid login credentials/i.test(err.message)
            ? 'Virheellinen sähköposti tai salasana.'
            : 'Kirjautuminen epäonnistui. Yritä hetken kuluttua uudelleen.',
        );
      }
    } catch {
      setError('Kirjautuminen epäonnistui. Tarkista verkkoyhteys.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full grid place-items-center px-4 py-10">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-forest-600 text-cream-50 grid place-items-center shadow-soft">
            <Home className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl text-forest-700">Koti</h1>
        </div>
        <label className="block text-sm text-ink-700">
          Sähköposti
          <input
            type="email"
            autoComplete="email"
            required
            className="input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm text-ink-700">
          Salasana
          <input
            type="password"
            autoComplete="current-password"
            required
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-terracotta-600">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          Kirjaudu
        </button>
      </form>
    </div>
  );
}
