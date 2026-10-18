import moment from 'moment';
import { useEffect, useState } from 'react';
import { supabase } from '../services';

export interface UseRealtimeSyncProps {
  userId?: string;
  onTransactionChange?: () => void;
  onWalletChange?: () => void;
  onBudgetChange?: () => void;
  onDebtChange?: () => void;
}

// Tables in the `supabase_realtime` publication (see the realtime migrations in
// nexo-app-api) mapped to the request-cache resource and window event they drive.
const SYNCED_TABLES = [
  { table: 'transactions', event: 'transactions-changed' },
  { table: 'wallets', event: 'wallets-changed' },
  { table: 'budgets', event: 'budgets-changed' },
  { table: 'debts', event: 'debts-changed' },
  { table: 'categories', event: 'categories-changed' },
] as const;

// iOS suspends the WebSocket while the PWA is in the background; after this long
// away, assume events were missed and refetch everything on return.
const RESUME_REFRESH_AFTER_MS = 30_000;

// Users signed in with the Go API's own JWT (username login) have no Supabase
// session, so realtime delivers nothing; poll instead while the app is visible.
export const REALTIME_POLL_INTERVAL_MS = 60_000;

const refreshAllTables = () => {
  for (const { event } of SYNCED_TABLES) {
    window.dispatchEvent(new Event(event));
  }
};

export function useRealtimeSync(props?: UseRealtimeSyncProps) {
  const { userId, onTransactionChange, onWalletChange, onBudgetChange, onDebtChange } = props || {};
  const [connection, setConnection] = useState(0);
  // null = not yet known; realtime needs a Supabase session, otherwise poll
  const [hasSupabaseSession, setHasSupabaseSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setHasSupabaseSession(Boolean(data.session));
      })
      .catch(() => {
        if (active) setHasSupabaseSession(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setHasSupabaseSession(Boolean(session));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [userId]);

  // Polling fallback: every minute while visible, never while hidden
  useEffect(() => {
    if (!userId || hasSupabaseSession !== false) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer === undefined) timer = setInterval(refreshAllTables, REALTIME_POLL_INTERVAL_MS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const handleVisibility = () => (document.visibilityState === 'visible' ? start() : stop());
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userId, hasSupabaseSession]);

  useEffect(() => {
    if (!userId || !hasSupabaseSession) return;

    const callbacks: Record<string, (() => void) | undefined> = {
      transactions: onTransactionChange,
      wallets: onWalletChange,
      budgets: onBudgetChange,
      debts: onDebtChange,
    };

    let channel = supabase.channel(`user-sync-${userId}-${connection}`);
    for (const { table, event } of SYNCED_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        () => {
          window.dispatchEvent(new Event(event));
          callbacks[table]?.();
        }
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    userId,
    hasSupabaseSession,
    connection,
    onTransactionChange,
    onWalletChange,
    onBudgetChange,
    onDebtChange,
  ]);

  // Reconnect and refetch when the PWA comes back to the foreground or online
  useEffect(() => {
    if (!userId) return;
    let hiddenAt = 0;

    const resync = () => {
      setConnection((n) => n + 1);
      refreshAllTables();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = moment().valueOf();
      } else if (hiddenAt && moment().valueOf() - hiddenAt > RESUME_REFRESH_AFTER_MS) {
        hiddenAt = 0;
        resync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', resync);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', resync);
    };
  }, [userId]);
}
