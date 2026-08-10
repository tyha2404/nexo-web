import { request } from './client';
import type { PaginatedResult } from '../commons/types';

export class CRUDService<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  protected basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async list(filters?: Record<string, any>): Promise<PaginatedResult<T>> {
    let query = '';
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params.append(key, val.toString());
        }
      });
      const queryString = params.toString();
      if (queryString) {
        query = `?${queryString}`;
      }
    }

    const res = await request<PaginatedResult<T> | T[]>(`${this.basePath}${query}`, {
      method: 'GET',
    });

    if (Array.isArray(res)) {
      return { items: res, total: res.length, page: 1, limit: res.length || 10 };
    }
    return res;
  }

  async getById(id: string): Promise<T> {
    return request<T>(`${this.basePath}/${id}`, {
      method: 'GET',
    });
  }

  async create(data: CreateDTO): Promise<T> {
    return request<T>(this.basePath, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update(id: string, data: UpdateDTO): Promise<T> {
    return request<T>(`${this.basePath}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(id: string): Promise<void> {
    return request<void>(`${this.basePath}/${id}`, {
      method: 'DELETE',
    });
  }
}
