const BASE_URL = 'http://localhost:3001/api/v1';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  amount: number;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cost {
  id: string;
  userId: string;
  title: string;
  amount: number;
  currency: string;
  incurredAt: string;
  categoryId: string;
  categoryName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SummaryReport {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  percentage: number;
}

export interface CategoryBreakdownReport {
  items: CategoryBreakdownItem[];
  totalExpense: number;
}

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
  list: async (): Promise<Category[]> => {
    return request<Category[]>('/categories', {
      method: 'GET',
    });
  },

  create: async (data: { name: string; type: 'INCOME' | 'EXPENSE'; description?: string }): Promise<Category> => {
    return request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: { name?: string; type?: 'INCOME' | 'EXPENSE'; description?: string }): Promise<Category> => {
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
  list: async (filters?: { type?: 'INCOME' | 'EXPENSE'; categoryId?: string; startDate?: string; endDate?: string }): Promise<Transaction[]> => {
    let query = '';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      query = '?' + params.toString();
    }
    return request<Transaction[]>(`/transactions${query}`, {
      method: 'GET',
    });
  },

  create: async (data: {
    categoryId: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
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
      type?: 'INCOME' | 'EXPENSE';
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

export const costService = {
  list: async (): Promise<Cost[]> => {
    return request<Cost[]>('/costs', {
      method: 'GET',
    });
  },

  create: async (data: {
    title: string;
    amount: number;
    currency: string;
    incurredAt: string;
    categoryId: string;
  }): Promise<Cost> => {
    return request<Cost>('/costs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: {
      title?: string;
      amount?: number;
      currency?: string;
      incurredAt?: string;
      categoryId?: string;
    }
  ): Promise<Cost> => {
    return request<Cost>(`/costs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    return request<void>(`/costs/${id}`, {
      method: 'DELETE',
    });
  },
};

export const reportService = {
  summary: async (): Promise<SummaryReport> => {
    return request<SummaryReport>('/reports/summary', {
      method: 'GET',
    });
  },

  categoryBreakdown: async (): Promise<CategoryBreakdownReport> => {
    return request<CategoryBreakdownReport>('/reports/category-breakdown', {
      method: 'GET',
    });
  },
};
