// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { signInWithPassword, state } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  state: { session: null as unknown, loading: false, disabled: false, configured: true },
}));

vi.mock('./supabase', () => ({
  supabase: { auth: { signInWithPassword, signOut: vi.fn() } },
  useSession: () => ({ session: state.session, loading: state.loading }),
  authDisabled: () => state.disabled,
  get supabaseConfigured() {
    return state.configured;
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

import LoginView from '../views/LoginView';
import AuthGate from './AuthGate';

describe('auth', () => {
  beforeEach(() => {
    cleanup();
    signInWithPassword.mockReset();
    state.session = null;
    state.loading = false;
    state.disabled = false;
    state.configured = true;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(200, { needsOwner: false }));
  });

  it('REQ-M01-9: shows a Finnish error message when sign-in fails', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<LoginView />);
    await userEvent.type(await screen.findByLabelText(/sähköposti/i), 'a@b.fi');
    await userEvent.type(screen.getByLabelText(/salasana/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Kirjaudu' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/virheellinen|väärä|epäonnistui/i),
    );
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.fi', password: 'wrong' });
  });

  it('REQ-M01-9: has no registration or password reset', async () => {
    render(<LoginView />);
    await screen.findByRole('button', { name: 'Kirjaudu' });
    expect(screen.queryByText(/rekister|unohd|palauta/i)).toBeNull();
  });

  it('tyhjässä asennuksessa näytetään tunnuksen luonti, joka kirjaa sisään', async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { needsOwner: true }))
      .mockResolvedValueOnce(jsonResponse(201, { created: true }));
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginView />);
    await userEvent.type(await screen.findByLabelText(/sähköposti/i), 'a@b.fi');
    await userEvent.type(screen.getByLabelText(/salasana/i), 'salasana123');
    await userEvent.click(screen.getByRole('button', { name: /luo tunnus/i }));
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/setup');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.fi', password: 'salasana123' });
  });

  it('ilman Supabase-kytkentää näytetään ohje', () => {
    state.configured = false;
    render(<LoginView />);
    expect(screen.getByText(/tietokantaa ei ole vielä kytketty/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('REQ-M01-10: without a session only the login view is shown', async () => {
    render(
      <AuthGate>
        <div>sovellus</div>
      </AuthGate>,
    );
    expect(screen.queryByText('sovellus')).toBeNull();
    expect(await screen.findByRole('button', { name: 'Kirjaudu' })).toBeTruthy();
  });

  it('REQ-M01-10: with a session the app is shown', () => {
    state.session = { access_token: 't' };
    render(
      <AuthGate>
        <div>sovellus</div>
      </AuthGate>,
    );
    expect(screen.getByText('sovellus')).toBeTruthy();
  });

  it('REQ-M01-11: VITE_AUTH_DISABLED bypasses the login', () => {
    state.disabled = true;
    render(
      <AuthGate>
        <div>sovellus</div>
      </AuthGate>,
    );
    expect(screen.getByText('sovellus')).toBeTruthy();
  });
});
