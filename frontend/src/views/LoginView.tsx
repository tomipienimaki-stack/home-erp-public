import { useEffect, useState, type FormEvent } from 'react';
import { Home } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';

type Mode = 'checking' | 'login' | 'setup' | 'unconfigured';

/** Ensimmäisellä käynnistyskerralla (ei vielä omistajaa) näytetään tunnuksen luonti. */
async function fetchNeedsOwner(): Promise<boolean> {
  try {
    const res = await fetch('/api/setup');
    if (!res.ok) return false;
    return Boolean((await res.json()).needsOwner);
  } catch {
    return false;
  }
}

export default function LoginView() {
  const [mode, setMode] = useState<Mode>(supabaseConfigured ? 'checking' : 'unconfigured');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [starterRecipes, setStarterRecipes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let active = true;
    fetchNeedsOwner().then((needs) => active && setMode(needs ? 'setup' : 'login'));
    return () => {
      active = false;
    };
  }, []);

  async function signIn() {
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(
        /invalid login credentials/i.test(err.message)
          ? 'Virheellinen sähköposti tai salasana.'
          : 'Kirjautuminen epäonnistui. Yritä hetken kuluttua uudelleen.',
      );
    }
  }

  async function createOwner() {
    if (password.length < 8) {
      setError('Salasanassa pitää olla vähintään 8 merkkiä.');
      return;
    }
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, starterRecipes }),
    });
    if (res.status === 409) {
      setMode('login');
      setError('Tunnus on jo luotu. Kirjaudu sisään.');
      return;
    }
    if (!res.ok) {
      setError('Tunnuksen luonti epäonnistui. Tarkista sähköpostiosoite ja yritä uudelleen.');
      return;
    }
    await signIn();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await (mode === 'setup' ? createOwner() : signIn());
    } catch {
      setError('Yhteys epäonnistui. Tarkista verkkoyhteys.');
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-forest-600 text-cream-50 grid place-items-center shadow-soft">
        <Home className="w-5 h-5" />
      </div>
      <h1 className="font-display text-2xl text-forest-700">Koti</h1>
    </div>
  );

  if (mode === 'unconfigured') {
    return (
      <div className="min-h-full grid place-items-center px-4 py-10">
        <div className="card w-full max-w-sm p-6 space-y-3">
          {header}
          <p className="text-sm text-ink-700">Tietokantaa ei ole vielä kytketty.</p>
          <p className="text-sm text-ink-700">
            Avaa projekti Vercelissä, valitse <strong>Storage → Create Database → Supabase</strong> ja
            kytke se tähän projektiin. Julkaise sen jälkeen uudelleen (<strong>Deployments → Redeploy</strong>).
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'checking') return null;

  const setup = mode === 'setup';
  return (
    <div className="min-h-full grid place-items-center px-4 py-10">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 space-y-4">
        {header}
        {setup && (
          <p className="text-sm text-ink-700">
            Tervetuloa! Luo itsellesi tunnus. Sovellus on yhden kotitalouden, joten tunnuksen luonnin
            jälkeen uusia tunnuksia ei voi luoda.
          </p>
        )}
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
          Salasana{setup && ' (vähintään 8 merkkiä)'}
          <input
            type="password"
            autoComplete={setup ? 'new-password' : 'current-password'}
            required
            minLength={setup ? 8 : undefined}
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {setup && (
          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={starterRecipes}
              onChange={(e) => setStarterRecipes(e.target.checked)}
            />
            <span>
              Lisää 8 esimerkkireseptiä, jotta näet heti miten viikko ja kauppalista toimivat. Ne on
              merkitty tagilla "esimerkki" ja voit poistaa ne milloin vain.
            </span>
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-terracotta-600">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {setup ? 'Luo tunnus ja aloita' : 'Kirjaudu'}
        </button>
      </form>
    </div>
  );
}
