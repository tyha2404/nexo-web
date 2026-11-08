import { beforeEach, describe, expect, it, vi } from 'vitest';

type AuthCallback = (event: string, session: { access_token: string } | null) => void;
const { auth, captured } = vi.hoisted(() => {
  const captured: { cb: AuthCallback | null } = { cb: null };
  return {
    captured,
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn((cb: AuthCallback) => {
        captured.cb = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  };
});
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth }) }));

const { syncSupabaseToken } = await import('./supabase');

beforeEach(() => {
  localStorage.clear();
  auth.getSession.mockReset();
});

describe('syncSupabaseToken', () => {
  it('copies a refreshed Supabase access token over the stored bearer token', async () => {
    localStorage.setItem('token', 'old');
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'new' } } });
    await syncSupabaseToken();
    expect(localStorage.getItem('token')).toBe('new');
  });

  it('does nothing when signed out (no stored token)', async () => {
    await syncSupabaseToken();
    expect(auth.getSession).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('keeps an API token when there is no Supabase session', async () => {
    localStorage.setItem('token', 'go-api-token');
    auth.getSession.mockResolvedValue({ data: { session: null } });
    await syncSupabaseToken();
    expect(localStorage.getItem('token')).toBe('go-api-token');
  });

  it('keeps the stored token when Supabase is unreachable', async () => {
    localStorage.setItem('token', 'old');
    auth.getSession.mockRejectedValue(new TypeError('offline'));
    await expect(syncSupabaseToken()).resolves.toBeUndefined();
    expect(localStorage.getItem('token')).toBe('old');
  });
});

describe('TOKEN_REFRESHED listener', () => {
  it('stores the refreshed token only while signed in', () => {
    captured.cb?.('TOKEN_REFRESHED', { access_token: 'ignored' });
    expect(localStorage.getItem('token')).toBeNull(); // signed out: don't sign back in

    localStorage.setItem('token', 'old');
    captured.cb?.('SIGNED_IN', { access_token: 'other-event' });
    expect(localStorage.getItem('token')).toBe('old');
    captured.cb?.('TOKEN_REFRESHED', { access_token: 'fresh' });
    expect(localStorage.getItem('token')).toBe('fresh');
  });
});
