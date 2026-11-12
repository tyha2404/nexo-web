import moment from 'moment';
import { APP_EVENTS, REFRESH_TOKEN_STORAGE_KEY, TOKEN_STORAGE_KEY } from '../commons/constants';
import { syncSupabaseToken } from './supabase';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
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
// Renew this long before the access token expires (clock skew, slow networks).
const REFRESH_LEEWAY_MS = 60_000;
// Paths that must never carry or renew a session.
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export interface SessionTokens {
  token: string;
  refreshToken?: string;
}

export function saveSession({ token, refreshToken }: SessionTokens): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

/** Clears the stored session and revokes its refresh token on the server (best effort). */
export function endSession(): void {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
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
type RefreshResult = 'refreshed' | 'invalid' | 'failed';
let refreshInFlight: Promise<RefreshResult> | null = null;

/** Renews the access token with the refresh token. Concurrent callers share one request. */
export function refreshSession(): Promise<RefreshResult> {
  refreshInFlight ??= runRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function runRefresh(): Promise<RefreshResult> {
  const attempted = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!attempted) return 'invalid';

  const exchange = async (): Promise<RefreshResult> => {
    const current = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
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
      if (localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) === current)
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
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
    if (localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) !== current) {
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
  if (!localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)) return;
  const expiresAt = tokenExpiresAt(localStorage.getItem(TOKEN_STORAGE_KEY));
  if (expiresAt !== null && expiresAt - moment().valueOf() < REFRESH_LEEWAY_MS)
    await refreshSession();
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
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    const headers = new Headers(options.headers);
    if (!isPublic && token && token !== 'undefined')
      headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData))
      headers.set('Content-Type', 'application/json');
    return fetch(`${BASE_URL}${path}`, { ...options, headers });
  };

  const response = await send();
  if (response.status !== 401 || isPublic || !localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)) {
    return response;
  }
  const result = await refreshSession();
  if (result === 'refreshed') return send();
  if (result === 'failed') {
    throw new ApiError('Không làm mới được phiên đăng nhập, vui lòng thử lại.', 0);
  }
  return response;
}

/** Message of a JSON error envelope ({message, error}), without repeating a detail it already contains. */
function errorMessage(text: string, status: number): string {
  const fallback = `HTTP error! status: ${status}`;
  try {
    const parsed = JSON.parse(text) as { message?: unknown; error?: unknown };
    const message = typeof parsed.message === 'string' ? parsed.message : '';
    const detail = typeof parsed.error === 'string' ? parsed.error : '';
    if (message && detail.includes(message)) return message;
    // "Validation failed" + "validation failed: X is required" → "Validation failed: X is required"
    const prefix = `${message.toLowerCase()}: `;
    const rest =
      message && detail.toLowerCase().startsWith(prefix) ? detail.slice(prefix.length) : detail;
    return [message, rest].filter(Boolean).join(': ') || fallback;
  } catch {
    return text || fallback;
  }
}

/**
 * The ApiError of a non-2xx response. A 401 on a non-auth path of a signed-in
 * session also dispatches `auth-expired`, so the app can sign out.
 */
export async function readApiError(
  response: Response,
  { path, hadToken }: { path: string; hadToken: boolean }
): Promise<ApiError> {
  let text = '';
  try {
    text = await response.text();
  } catch {
    // An unreadable body still yields the status message.
  }
  if (response.status === 401 && hadToken && !path.startsWith('/auth/')) {
    window.dispatchEvent(new Event(APP_EVENTS.AUTH_EXPIRED));
  }
  return new ApiError(errorMessage(text, response.status), response.status);
}

/** Whether a bearer token is stored (read before a request, for readApiError). */
export const hasStoredToken = (): boolean => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hadToken = hasStoredToken();
  const response = await authFetch(path, options);
  if (!response.ok) throw await readApiError(response, { path, hadToken });
  const text = await response.text();
  const value = text ? unwrap<T>(JSON.parse(text)) : ({} as T);
  return value;
}
