import type { AuthResponse, User } from '../commons/types';
import { request } from './client';

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
