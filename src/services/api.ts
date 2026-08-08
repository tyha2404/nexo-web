const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

import { TransactionType } from '../commons/constants';
export { TransactionType };

import type {
  AuthResponse,
  Category,
  CategoryBreakdownReport,
  PaginatedResult,
  SummaryReport,
  Transaction,
  User,
} from '../commons/types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

  // Check if response has content
  const text = await response.text();
  if (!text) return {} as T;

  const parsed = JSON.parse(text);
  if (parsed.success && parsed.items !== undefined && parsed.total !== undefined) {
    return {
      items: parsed.items,
      total: parsed.total,
      page: parsed.page || 1,
      limit: parsed.limit || 10,
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

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (username: string, email: string, password: string): Promise<User> => {
    return request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  whoami: async (): Promise<User> => {
    return request<User>('/auth/whoami', {
      method: 'GET',
    });
  },
};

export const categoryService = {
  list: async (params?: {
    type?: TransactionType;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<Category>> => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await request<PaginatedResult<Category> | Category[]>(`/categories${query}`, {
      method: 'GET',
    });
    if (Array.isArray(res)) {
      return { items: res, total: res.length, page: 1, limit: res.length || 10 };
    }
    return res;
  },

  create: async (data: {
    name: string;
    type: TransactionType;
    description?: string;
    budgetLimit?: number;
  }): Promise<Category> => {
    return request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: { name?: string; type?: TransactionType; description?: string; budgetLimit?: number }
  ): Promise<Category> => {
    return request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    return request<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};

export const transactionService = {
  list: async (filters?: {
    type?: TransactionType;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<Transaction>> => {
    let query = '';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      query = '?' + params.toString();
    }
    const res = await request<PaginatedResult<Transaction> | Transaction[]>(
      `/transactions${query}`,
      {
        method: 'GET',
      }
    );
    if (Array.isArray(res)) {
      return { items: res, total: res.length, page: 1, limit: res.length || 10 };
    }
    return res;
  },

  create: async (data: {
    categoryId: string;
    amount: number;
    type: TransactionType;
    description?: string;
    transactionDate: string;
  }): Promise<Transaction> => {
    return request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: {
      categoryId?: string;
      amount?: number;
      type?: TransactionType;
      description?: string;
      transactionDate?: string;
    }
  ): Promise<Transaction> => {
    return request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    return request<void>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },
};

export const reportService = {
  summary: async (params?: { startDate?: string; endDate?: string }): Promise<SummaryReport> => {
    const query =
      params?.startDate && params?.endDate
        ? `?startDate=${params.startDate}&endDate=${params.endDate}`
        : '';
    return request<SummaryReport>(`/reports/summary${query}`, {
      method: 'GET',
    });
  },

  categoryBreakdown: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<CategoryBreakdownReport> => {
    const query =
      params?.startDate && params?.endDate
        ? `?startDate=${params.startDate}&endDate=${params.endDate}`
        : '';
    return request<CategoryBreakdownReport>(`/reports/category-breakdown${query}`, {
      method: 'GET',
    });
  },
};
