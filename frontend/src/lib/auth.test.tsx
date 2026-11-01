// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { signInWithPassword, state } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  state: { session: null as unknown, loading: false, disabled: false },
}));

vi.mock('./supabase', () => ({
  supabase: { auth: { signInWithPassword, signOut: vi.fn() } },
  useSession: () => ({ session: state.session, loading: state.loading }),
  authDisabled: () => state.disabled,
}));

import LoginView from '../views/LoginView';
import AuthGate from './AuthGate';

describe('auth', () => {
  beforeEach(() => {
    cleanup();
    signInWithPassword.mockReset();
    state.session = null;
    state.loading = false;
    state.disabled = false;
  });

  it('REQ-M01-9: shows a Finnish error message when sign-in fails', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<LoginView />);
    await userEvent.type(screen.getByLabelText(/sähköposti/i), 'a@b.fi');
    await userEvent.type(screen.getByLabelText(/salasana/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Kirjaudu' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/virheellinen|väärä|epäonnistui/i),
    );
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.fi', password: 'wrong' });
  });

  it('REQ-M01-9: has no registration or password reset', () => {
    render(<LoginView />);
    expect(screen.queryByText(/rekister|unohd|palauta/i)).toBeNull();
  });

  it('REQ-M01-10: without a session only the login view is shown', () => {
    render(
      <AuthGate>
        <div>sovellus</div>
      </AuthGate>,
    );
    expect(screen.queryByText('sovellus')).toBeNull();
    expect(screen.getByRole('button', { name: 'Kirjaudu' })).toBeTruthy();
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
