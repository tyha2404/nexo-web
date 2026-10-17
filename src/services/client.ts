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
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/auth/login')) await syncSupabaseToken();
  const token = localStorage.getItem('token') || '';
  const headers = new Headers(options.headers);
  if (token && token !== 'undefined') headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
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
  return value;
}
