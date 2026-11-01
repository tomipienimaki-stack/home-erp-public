import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, signOut } = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn() }));

vi.mock('./supabase', () => ({
  supabase: { auth: { getSession, signOut } },
  authDisabled: () => false,
}));

import { PantryAPI } from './api';

describe('api http', () => {
  beforeEach(() => {
    getSession.mockReset();
    signOut.mockReset().mockResolvedValue({ error: null });
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } });
  });

  it('REQ-M01-8: adds Authorization Bearer header from the current session', async () => {
    const fetchMock = vi.fn(async () => new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await PantryAPI.list();
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
  });

  it('REQ-M01-8: a 401 response signs the user out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
    await expect(PantryAPI.list()).rejects.toThrow(/401/);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('REQ-M01-8: other errors do not sign the user out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    await expect(PantryAPI.list()).rejects.toThrow(/500/);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('REQ-M01-7: session persistence is enabled in the supabase client', async () => {
    const src = (await import('node:fs')).readFileSync(
      new URL('./supabase.ts', import.meta.url),
      'utf8',
    );
    expect(src).toMatch(/persistSession:\s*true/);
    expect(src).toContain('VITE_SUPABASE_URL');
    expect(src).toContain('VITE_SUPABASE_ANON_KEY');
  });
});
