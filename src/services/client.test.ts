import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  BASE_URL,
  authFetch,
  clearSession,
  endSession,
  readApiError,
  refreshSession,
  request,
  saveSession,
} from './client';

// Supabase is out of scope here: its token sync is a no-op.
vi.mock('./supabase', () => ({ syncSupabaseToken: vi.fn(async () => undefined) }));

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** A JWT-shaped token expiring `inSeconds` from now (signature is never checked client-side). */
const jwt = (inSeconds: number) =>
  [
    'eyJhbGciOiJIUzI1NiJ9',
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + inSeconds })),
    'sig',
  ].join('.');

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn<FetchFn>>;
const calls = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    path: url.replace(BASE_URL, ''),
    auth: new Headers(init?.headers).get('Authorization'),
    body: init?.body,
    init,
  }));

function route(handler: Handler) {
  // async, so a throwing handler rejects like a real network error
  fetchMock = vi.fn<FetchFn>(async (url, init) => handler(url.replace(BASE_URL, ''), init));
  vi.stubGlobal('fetch', fetchMock);
}

let authExpired: number;
const onAuthExpired = () => authExpired++;

beforeEach(() => {
  localStorage.clear();
  authExpired = 0;
  window.addEventListener('auth-expired', onAuthExpired);
});
afterEach(() => {
  window.removeEventListener('auth-expired', onAuthExpired);
  vi.unstubAllGlobals();
});

describe('request: envelope and headers', () => {
  it('unwraps {success, data}', async () => {
    route(() => json({ success: true, data: { id: 'w1' } }));
    await expect(request('/wallets/w1')).resolves.toEqual({ id: 'w1' });
  });

  it('unwraps paginated responses with defaults', async () => {
    route(() => json({ success: true, items: [1, 2], total: 2, summary: { sum: 3 } }));
    await expect(request('/transactions')).resolves.toEqual({
      items: [1, 2],
      total: 2,
      page: 1,
      limit: 10,
      summary: { sum: 3 },
    });
  });

  it('unwraps item lists without a total, and passes other bodies through', async () => {
    route(() => json({ success: true, items: ['a'] }));
    await expect(request('/tags')).resolves.toEqual(['a']);
    route(() => json({ ok: 1 }));
    await expect(request('/health')).resolves.toEqual({ ok: 1 });
    route(() => new Response(null, { status: 204 }));
    await expect(request('/x', { method: 'DELETE' })).resolves.toEqual({});
  });

  it('sends the bearer token and a JSON content type', async () => {
    saveSession({ token: 'access-1' });
    route(() => json({ success: true, data: null }));
    await request('/wallets', { method: 'POST', body: JSON.stringify({ name: 'Ví' }) });

    const [call] = calls();
    expect(call.auth).toBe('Bearer access-1');
    expect(new Headers(call.init.headers).get('Content-Type')).toBe('application/json');
  });

  it('does not force a JSON content type on FormData', async () => {
    route(() => json({ success: true, data: null }));
    await request('/upload', { method: 'POST', body: new FormData() });
    expect(new Headers(calls()[0].init.headers).get('Content-Type')).toBeNull();
  });

  it('never sends the bearer token to login', async () => {
    saveSession({ token: 'old-token', refreshToken: 'r1' });
    route(() => json({ success: true, data: { token: 't' } }));
    await request('/auth/login', { method: 'POST', body: '{}' });
    expect(calls()[0].auth).toBeNull();
  });

  it('ignores a stored "undefined" token', async () => {
    localStorage.setItem('token', 'undefined');
    route(() => json({ success: true, data: 1 }));
    await request('/wallets');
    expect(calls()[0].auth).toBeNull();
  });
});

describe('request: errors', () => {
  it('builds the message from a JSON error body', async () => {
    route(() => json({ message: 'Invalid request', error: 'amount must be > 0' }, 400));
    const err = await request<never>('/transactions', { method: 'POST', body: '{}' }).catch(
      (e: ApiError) => e
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toBe('Invalid request: amount must be > 0');
  });

  it('does not repeat a message the error detail already contains', async () => {
    // e.g. 422 of POST /chat/actions/{id}/confirm
    route(() =>
      json({ message: 'Số dư ví không đủ', error: 'pending action failed: Số dư ví không đủ' }, 422)
    );
    await expect(request('/chat/actions/a1/confirm')).rejects.toMatchObject({
      status: 422,
      message: 'Số dư ví không đủ',
    });
  });

  it('drops a detail prefix that repeats the message', async () => {
    // API validation errors: message "Validation failed", error "validation failed: …"
    route(() =>
      json({ message: 'Validation failed', error: 'validation failed: Title is required' }, 400)
    );
    await expect(request('/debts')).rejects.toMatchObject({
      status: 400,
      message: 'Validation failed: Title is required',
    });
  });

  it('readApiError: 401 dispatches auth-expired only for a signed-in, non-auth request', async () => {
    const res = () => json({ message: 'Unauthorized' }, 401);
    const err = await readApiError(res(), { path: '/chat/stream', hadToken: true });
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 401, message: 'Unauthorized' });
    expect(authExpired).toBe(1);
    await readApiError(res(), { path: '/chat/stream', hadToken: false });
    await readApiError(res(), { path: '/auth/login', hadToken: true });
    expect(authExpired).toBe(1);
  });

  it('falls back to a text body, then to the status', async () => {
    route(() => new Response('upstream down', { status: 502 }));
    await expect(request('/reports')).rejects.toThrow('upstream down');
    route(() => new Response('', { status: 503 }));
    await expect(request('/reports')).rejects.toThrow('HTTP error! status: 503');
  });

  it('a 401 without a refresh token ends the session (auth-expired)', async () => {
    saveSession({ token: 'expired' });
    route(() => json({ error: 'Invalid or expired token' }, 401));
    await expect(request('/wallets')).rejects.toMatchObject({ status: 401 });
    expect(authExpired).toBe(1);
  });

  it('a 401 on /auth/* or without any token does not fire auth-expired', async () => {
    route(() => json({ message: 'nope' }, 401));
    await expect(request('/wallets')).rejects.toMatchObject({ status: 401 });
    saveSession({ token: 'x' });
    await expect(request('/auth/whoami')).rejects.toMatchObject({ status: 401 });
    expect(authExpired).toBe(0);
  });
});

describe('refresh on 401', () => {
  /** API that rejects `expiredToken` and rotates refresh tokens. */
  function api(opts: { expiredToken: string; liveRefresh: string; refreshStatus?: number }) {
    let n = 0;
    route((path, init) => {
      if (path === '/auth/refresh') {
        if (opts.refreshStatus) return json({ message: 'refresh failed' }, opts.refreshStatus);
        const { refreshToken } = JSON.parse(String(init.body));
        if (refreshToken !== opts.liveRefresh) return json({ message: 'invalid' }, 401);
        n++;
        opts.liveRefresh = `refresh-${n}`;
        return json({
          success: true,
          data: { token: `access-${n}`, refreshToken: `refresh-${n}`, expiresIn: 900 },
        });
      }
      if (path === '/auth/logout') return json({ success: true, data: {} });
      const auth = new Headers(init.headers).get('Authorization');
      if (auth === `Bearer ${opts.expiredToken}`) return json({ error: 'expired' }, 401);
      return json({ success: true, data: { path, auth } });
    });
  }

  it('renews the token, stores the rotated pair and retries the request', async () => {
    saveSession({ token: 'stale', refreshToken: 'refresh-0' });
    api({ expiredToken: 'stale', liveRefresh: 'refresh-0' });

    await expect(request('/wallets')).resolves.toEqual({
      path: '/wallets',
      auth: 'Bearer access-1',
    });
    expect(localStorage.getItem('token')).toBe('access-1');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-1');
    expect(calls().map((c) => c.path)).toEqual(['/wallets', '/auth/refresh', '/wallets']);
    expect(calls()[1].auth).toBeNull();
    expect(authExpired).toBe(0);
  });

  it('shares one refresh between concurrent 401s', async () => {
    saveSession({ token: 'stale', refreshToken: 'refresh-0' });
    api({ expiredToken: 'stale', liveRefresh: 'refresh-0' });

    const results = await Promise.all([request('/a'), request('/b'), request('/c')]);

    expect(results.map((r) => (r as { auth: string }).auth)).toEqual([
      'Bearer access-1',
      'Bearer access-1',
      'Bearer access-1',
    ]);
    expect(calls().filter((c) => c.path === '/auth/refresh')).toHaveLength(1);
  });

  it('a rejected refresh token signs the user out', async () => {
    saveSession({ token: 'stale', refreshToken: 'stolen' });
    api({ expiredToken: 'stale', liveRefresh: 'someone-else' });

    await expect(request('/wallets')).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(authExpired).toBe(1);
  });

  it('a refresh that cannot reach the server keeps the session (status 0, no logout)', async () => {
    saveSession({ token: 'stale', refreshToken: 'refresh-0' });
    route((path) => {
      if (path === '/auth/refresh') throw new TypeError('Failed to fetch');
      return json({ error: 'expired' }, 401);
    });

    await expect(request('/wallets')).rejects.toMatchObject({ status: 0 });
    expect(localStorage.getItem('token')).toBe('stale');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-0');
    expect(authExpired).toBe(0);
  });

  it.each([500, 429])('a %d from /auth/refresh is a temporary failure', async (status) => {
    saveSession({ token: 'stale', refreshToken: 'refresh-0' });
    api({ expiredToken: 'stale', liveRefresh: 'refresh-0', refreshStatus: status });

    await expect(request('/wallets')).rejects.toMatchObject({ status: 0 });
    expect(localStorage.getItem('refreshToken')).toBe('refresh-0');
  });

  it('retries only once', async () => {
    saveSession({ token: 'stale', refreshToken: 'refresh-0' });
    let refreshes = 0;
    route((path) => {
      if (path === '/auth/refresh') {
        refreshes++;
        return json({ success: true, data: { token: 'still-bad', refreshToken: `r${refreshes}` } });
      }
      return json({ error: 'expired' }, 401);
    });

    await expect(request('/wallets')).rejects.toMatchObject({ status: 401 });
    expect(refreshes).toBe(1);
  });
});

describe('proactive refresh', () => {
  it('renews an access token that expires within a minute before sending', async () => {
    const soon = jwt(30);
    saveSession({ token: soon, refreshToken: 'refresh-0' });
    route((path) =>
      path === '/auth/refresh'
        ? json({ success: true, data: { token: 'access-1', refreshToken: 'refresh-1' } })
        : json({ success: true, data: 'ok' })
    );

    await request('/wallets');

    expect(calls().map((c) => [c.path, c.auth])).toEqual([
      ['/auth/refresh', null],
      ['/wallets', 'Bearer access-1'],
    ]);
  });

  it('leaves a fresh token alone, and never refreshes Supabase sessions', async () => {
    saveSession({ token: jwt(600), refreshToken: 'refresh-0' });
    route(() => json({ success: true, data: 'ok' }));
    await request('/wallets');

    saveSession({ token: jwt(10) }); // Supabase login: no refresh token
    await request('/wallets');

    expect(calls().map((c) => c.path)).toEqual(['/wallets', '/wallets']);
  });
});

describe('refreshSession across tabs', () => {
  it('uses the token another tab already rotated while waiting for the lock', async () => {
    saveSession({ token: 'stale', refreshToken: 'refresh-0' });
    route(() => json({ success: true, data: {} }));
    // The other tab holds the lock, rotates, then releases it to us.
    vi.stubGlobal('navigator', {
      locks: {
        request: async (_name: string, cb: () => Promise<unknown>) => {
          saveSession({ token: 'access-from-tab-2', refreshToken: 'refresh-from-tab-2' });
          return cb();
        },
      },
    });

    await expect(refreshSession()).resolves.toBe('refreshed');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('access-from-tab-2');
  });

  it('does not bring back a session that was signed out mid-refresh', async () => {
    saveSession({ token: 'stale', refreshToken: 'refresh-0' });
    route((path) => {
      if (path === '/auth/refresh') {
        clearSession(); // user hit "Đăng xuất" while the call was in flight
        return json({ success: true, data: { token: 'access-1', refreshToken: 'refresh-1' } });
      }
      return json({ success: true, data: {} });
    });

    await expect(refreshSession()).resolves.toBe('invalid');
    expect(localStorage.getItem('token')).toBeNull();
    // The orphaned new refresh token is revoked.
    const logout = calls().find((c) => c.path === '/auth/logout');
    expect(JSON.parse(String(logout?.body))).toEqual({ refreshToken: 'refresh-1' });
  });

  it('is invalid without a refresh token, and failed on a malformed response', async () => {
    route(() => json({ success: true, data: { token: 'only-access' } }));
    await expect(refreshSession()).resolves.toBe('invalid');

    saveSession({ token: 't', refreshToken: 'r' });
    await expect(refreshSession()).resolves.toBe('failed');
    route(() => new Response('not json', { status: 200 }));
    await expect(refreshSession()).resolves.toBe('failed');
  });
});

describe('session storage', () => {
  it('saveSession without a refresh token drops a leftover one', () => {
    saveSession({ token: 'a', refreshToken: 'r' });
    saveSession({ token: 'b' });
    expect(localStorage.getItem('token')).toBe('b');
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('endSession clears storage and revokes the refresh token', async () => {
    route(() => json({ success: true, data: {} }));
    saveSession({ token: 'a', refreshToken: 'r1' });

    endSession();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    const [call] = calls();
    expect(call.path).toBe('/auth/logout');
    expect(call.init.keepalive).toBe(true);
    expect(JSON.parse(String(call.body))).toEqual({ refreshToken: 'r1' });
  });

  it('endSession without a refresh token makes no request, and survives network errors', async () => {
    route(() => {
      throw new TypeError('offline');
    });
    saveSession({ token: 'supabase-token' });
    endSession();
    expect(fetchMock).not.toHaveBeenCalled();

    saveSession({ token: 'a', refreshToken: 'r1' });
    expect(() => endSession()).not.toThrow();
    await Promise.resolve();
  });
});

describe('authFetch', () => {
  it('returns the raw response for streaming callers', async () => {
    saveSession({ token: 'access' });
    route(() => new Response('data: {}\n\n', { status: 200 }));
    const res = await authFetch('/chat/stream', { method: 'POST', body: '{}' });
    expect(await res.text()).toBe('data: {}\n\n');
    expect(calls()[0].auth).toBe('Bearer access');
  });
});
