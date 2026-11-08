import { syncSupabaseToken } from './supabase';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
function unwrap<T>(parsed: Record<string, unknown>): T {
  if (parsed.success && parsed.items !== undefined && parsed.total !== undefined) {
    return {
      items: parsed.items,
      total: parsed.total,
      page: parsed.page || 1,
      limit: parsed.limit || 10,
      summary: parsed.summary,
    } as T;
  }
  if (parsed.success && parsed.data !== undefined) return parsed.data as T;
  if (parsed.success && parsed.items !== undefined) return parsed.items as T;
  return parsed as T;
}

// ---- Session tokens ----
// `token` is the API bearer token. Accounts that sign in through the Go API also
// get a `refreshToken` (rotated on every use) to renew the short-lived access
// token. Supabase accounts have none: supabase-js refreshes their token itself.
const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
// Renew this long before the access token expires (clock skew, slow networks).
const REFRESH_LEEWAY_MS = 60_000;
// Paths that must never carry or renew a session.
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export interface SessionTokens {
  token: string;
  refreshToken?: string;
}

export function saveSession({ token, refreshToken }: SessionTokens): void {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Clears the stored session and revokes its refresh token on the server (best effort). */
export function endSession(): void {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  clearSession();
  if (refreshToken) revokeRefreshToken(refreshToken);
}

function revokeRefreshToken(refreshToken: string): void {
  void fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    keepalive: true,
  }).catch(() => undefined);
}

/** Expiry (ms since epoch) of an API-issued JWT, or null when it can't be read. */
function tokenExpiresAt(token: string | null): number | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** refreshed: a new access token is stored. invalid: the session is over. failed: try later (offline, 5xx). */
export type RefreshResult = 'refreshed' | 'invalid' | 'failed';
let refreshInFlight: Promise<RefreshResult> | null = null;

/** Renews the access token with the refresh token. Concurrent callers share one request. */
export function refreshSession(): Promise<RefreshResult> {
  refreshInFlight ??= runRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function runRefresh(): Promise<RefreshResult> {
  const attempted = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!attempted) return 'invalid';

  const exchange = async (): Promise<RefreshResult> => {
    const current = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!current) return 'invalid';
    // Another tab rotated the token while we waited for the lock; its new
    // access token is already in localStorage.
    if (current !== attempted) return 'refreshed';

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current }),
      });
    } catch {
      return 'failed';
    }
    if (response.status === 401) {
      if (localStorage.getItem(REFRESH_TOKEN_KEY) === current)
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      return 'invalid';
    }
    if (!response.ok) return 'failed';

    let pair: SessionTokens;
    try {
      pair = unwrap<SessionTokens>(await response.json());
    } catch {
      return 'failed';
    }
    if (!pair.token || !pair.refreshToken) return 'failed';
    // Signed out (or into another account) while the call was in flight:
    // don't bring the old session back.
    if (localStorage.getItem(REFRESH_TOKEN_KEY) !== current) {
      revokeRefreshToken(pair.refreshToken);
      return 'invalid';
    }
    saveSession(pair);
    return 'refreshed';
  };

  // Serialise refreshes across tabs: the server treats a second use of the same
  // refresh token as theft and revokes the whole session.
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('nexo-refresh-token', exchange);
  }
  return exchange();
}

/** Keeps the bearer token valid: syncs Supabase's, renews an API token that is about to expire. */
async function ensureFreshToken(): Promise<void> {
  await syncSupabaseToken();
  if (!localStorage.getItem(REFRESH_TOKEN_KEY)) return;
  const expiresAt = tokenExpiresAt(localStorage.getItem(TOKEN_KEY));
  if (expiresAt !== null && expiresAt - Date.now() < REFRESH_LEEWAY_MS) await refreshSession();
}

/**
 * fetch() against the API with the bearer token. Renews the access token before
 * it expires, and once more on a 401 before retrying the request. Throws
 * ApiError(status 0) when the session could not be renewed for now (offline),
 * so callers don't mistake it for a signed-out session.
 */
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  if (!isPublic) await ensureFreshToken();

  const send = () => {
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const headers = new Headers(options.headers);
    if (!isPublic && token && token !== 'undefined')
      headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData))
      headers.set('Content-Type', 'application/json');
    return fetch(`${BASE_URL}${path}`, { ...options, headers });
  };

  const response = await send();
  if (response.status !== 401 || isPublic || !localStorage.getItem(REFRESH_TOKEN_KEY)) {
    return response;
  }
  const result = await refreshSession();
  if (result === 'refreshed') return send();
  if (result === 'failed') {
    throw new ApiError('Không làm mới được phiên đăng nhập, vui lòng thử lại.', 0);
  }
  return response;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hadToken = Boolean(localStorage.getItem(TOKEN_KEY));
  const response = await authFetch(path, options);
  if (!response.ok) {
    const errorText = await response.text();
    let message = `HTTP error! status: ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      message = [parsed.message, parsed.error].filter(Boolean).join(': ') || message;
    } catch {
      if (errorText) message = errorText;
    }
    if (response.status === 401 && hadToken && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth-expired'));
    }
    throw new ApiError(message, response.status);
  }
  const text = await response.text();
  const value = text ? unwrap<T>(JSON.parse(text)) : ({} as T);
  return value;
}
