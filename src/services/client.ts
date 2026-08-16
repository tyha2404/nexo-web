export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers);

  if (token && token !== 'undefined') {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.message && parsed.error) {
        errorMessage = `${parsed.message}: ${parsed.error}`;
      } else if (parsed.message) {
        errorMessage = parsed.message;
      } else if (parsed.error) {
        errorMessage = parsed.error;
      }
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  const text = await response.text();
  if (!text) return {} as T;

  const parsed = JSON.parse(text);
  if (parsed.success && parsed.items !== undefined && parsed.total !== undefined) {
    return {
      items: parsed.items,
      total: parsed.total,
      page: parsed.page || 1,
      limit: parsed.limit || 10,
      summary: parsed.summary,
    } as unknown as T;
  }
  if (parsed.success && parsed.data !== undefined) {
    return parsed.data as T;
  }
  if (parsed.success && parsed.items !== undefined) {
    return parsed.items as T;
  }
  return parsed as T;
}
