import { syncSupabaseToken } from './supabase';
import {
  cacheRevision,
  invalidateRequestCache,
  readRequestCache,
  requestCacheKey,
  writeRequestCache,
} from './requestCache';

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
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/auth/login')) await syncSupabaseToken();
  const token = localStorage.getItem('token') || '';
  const headers = new Headers(options.headers);
  if (token && token !== 'undefined') headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const isRead = !options.method || options.method === 'GET';
  // Scope the cache by user so it survives hourly token refreshes
  let key =
    isRead && token
      ? await requestCacheKey(localStorage.getItem('nexo-user-id') || token, path)
      : undefined;
  const revision = cacheRevision();
  // Validate identity online; use its last verified snapshot only on connection
  // or server failure, never on an explicit authentication rejection.
  if (key && options.cache !== 'no-store' && !path.startsWith('/auth/')) {
    const cached = readRequestCache(key, 30_000);
    if (cached) return cached.value as T;
  }
  try {
    const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text();
      let message = `HTTP error! status: ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        message = [parsed.message, parsed.error].filter(Boolean).join(': ') || message;
      } catch {
        if (errorText) message = errorText;
      }
      if (response.status === 401 && token && !path.startsWith('/auth/')) {
        window.dispatchEvent(new Event('auth-expired'));
      }
      throw new ApiError(message, response.status);
    }
    const text = await response.text();
    const value = text ? unwrap<T>(JSON.parse(text)) : ({} as T);
    // First whoami learns the user id: re-key so the offline copy is found on next launch
    const userId = path === '/auth/whoami' ? (value as { id?: string } | null)?.id : undefined;
    if (key && userId) {
      localStorage.setItem('nexo-user-id', userId);
      key = await requestCacheKey(userId, path);
    }
    if (token === (localStorage.getItem('token') || '')) {
      if (key && revision === cacheRevision()) writeRequestCache(key, path, value);
      if (!isRead) invalidateRequestCache(path.split('/')[1]);
    }
    return value;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    const transient =
      error instanceof TypeError || (error instanceof ApiError && error.status >= 500);
    if (key && transient && token === localStorage.getItem('token')) {
      const cached = readRequestCache(key);
      if (cached) {
        window.dispatchEvent(
          new CustomEvent('nexo-stale-data', { detail: { savedAt: cached.savedAt } })
        );
        return cached.value as T;
      }
    }
    throw error;
  }
}
