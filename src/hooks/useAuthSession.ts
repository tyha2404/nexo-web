import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { APP_EVENTS, LEGACY_DRAFT_KEY_PREFIX, USER_ID_STORAGE_KEY } from '../commons/constants';
import type { User } from '../commons/types';
import { ApiError, authService, clearSession, hasStoredToken } from '../services';

/**
 * The signed-in user. Verifies the stored token on start, on 'auth-changed' (login) and when
 * the device comes back online; logs out on 'auth-expired' (any API 401).
 * `onLogout` resets the app state that belongs to the session.
 */
export function useAuthSession(onLogout?: () => void) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const authAttempt = useRef(0);

  const checkAuth = useCallback(async () => {
    const attempt = ++authAttempt.current;
    setAuthError(null);
    if (!hasStoredToken()) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    try {
      const userData = await authService.whoami();
      // The token itself may have been renewed during the call; only a logout
      // or a new login (both bump authAttempt) makes this answer stale.
      if (attempt !== authAttempt.current || !hasStoredToken()) return;
      localStorage.setItem(USER_ID_STORAGE_KEY, userData.id);
      setUser(userData);
    } catch (err) {
      console.error('Failed to verify token', err);
      if (attempt !== authAttempt.current || !hasStoredToken()) return;
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        setUser(null);
      } else {
        setAuthError('Không kết nối được máy chủ Nexo. Kiểm tra API đang chạy rồi bấm Thử lại.');
      }
    } finally {
      if (attempt === authAttempt.current) setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };
    window.addEventListener(APP_EVENTS.AUTH_CHANGED, handleAuthChange);
    window.addEventListener('online', handleAuthChange);

    return () => {
      window.removeEventListener(APP_EVENTS.AUTH_CHANGED, handleAuthChange);
      window.removeEventListener('online', handleAuthChange);
    };
  }, [checkAuth]);

  const onLogoutRef = useRef(onLogout);
  useEffect(() => {
    onLogoutRef.current = onLogout;
  });

  const logout = useCallback(() => {
    authAttempt.current++;
    // Revokes the refresh token and clears the stored session.
    void authService.logout().catch(() => undefined);
    localStorage.removeItem(USER_ID_STORAGE_KEY);
    // Form drafts are no longer saved; this removes `nexo-draft:*` keys left by older versions.
    for (const key of Object.keys(localStorage))
      if (key.startsWith(LEGACY_DRAFT_KEY_PREFIX)) localStorage.removeItem(key);
    setUser(null);
    setAuthError(null);
    onLogoutRef.current?.();
  }, []);

  // Any API call rejected with 401 means the session is gone (expired or revoked)
  useEffect(() => {
    const handleAuthExpired = () => {
      if (!hasStoredToken()) return;
      toast.info('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', {
        toastId: APP_EVENTS.AUTH_EXPIRED,
      });
      logout();
    };
    window.addEventListener(APP_EVENTS.AUTH_EXPIRED, handleAuthExpired);
    return () => window.removeEventListener(APP_EVENTS.AUTH_EXPIRED, handleAuthExpired);
  }, [logout]);

  return { user, authLoading, authError, checkAuth, logout };
}
