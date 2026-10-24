import type { AuthResponse, User } from '../commons/types';
import { ApiError, request } from './client';
import { supabase } from './supabase';

export const authService = {
  login: async (usernameOrEmail: string, password: string): Promise<AuthResponse> => {
    const isEmail = usernameOrEmail.includes('@');

    // 1. If email, attempt Supabase Auth first
    if (isEmail) {
      const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
        email: usernameOrEmail,
        password,
      });

      if (!sbError && sbData?.session) {
        return {
          token: sbData.session.access_token,
          user: {
            id: sbData.user.id,
            email: sbData.user.email || usernameOrEmail,
            username: sbData.user.user_metadata?.username || usernameOrEmail.split('@')[0],
            createdAt: sbData.user.created_at,
            updatedAt: sbData.user.updated_at || sbData.user.created_at,
          },
        };
      }
    }

    // 2. Call Go API login (supports username or email). Drop any leftover Supabase
    // session first so its token refresh can't replace this account's API token.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: !isEmail ? usernameOrEmail : undefined,
        email: isEmail ? usernameOrEmail : undefined,
        password,
      }),
    });
  },

  register: async (username: string, email: string, password: string): Promise<User> => {
    // 1. Register with Supabase Auth
    const { data: sbData, error: sbError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (sbError) {
      throw new Error(sbError.message);
    }

    if (sbData?.user) {
      return {
        id: sbData.user.id,
        username,
        email,
        createdAt: sbData.user.created_at,
        updatedAt: sbData.user.created_at,
      };
    }

    // Fallback to Go API
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

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    // Supabase accounts keep their password in Supabase Auth (the API's copy is empty).
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user.email;
    if (email) {
      // updateUser doesn't check the current password, so re-authenticate first.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) throw new Error('Mật khẩu hiện tại không đúng.');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      return;
    }

    try {
      await request<unknown>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        throw new Error('Mật khẩu hiện tại không đúng.', { cause: err });
      }
      throw err;
    }
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('token');
    await supabase.auth.signOut();
  },
};
