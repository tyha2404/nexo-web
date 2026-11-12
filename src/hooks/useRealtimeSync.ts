import moment from 'moment';
import { useEffect, useState } from 'react';
import { DATA_EVENTS } from '../commons/constants';
import { supabase } from '../services';

interface UseRealtimeSyncProps {
  userId?: string;
}

// Tables in the `supabase_realtime` publication (see the realtime migrations in
// nexo-app-api) mapped to the window event they drive.
const SYNCED_TABLES = [
  { table: 'transactions', event: DATA_EVENTS.TRANSACTIONS_CHANGED },
  { table: 'wallets', event: DATA_EVENTS.WALLETS_CHANGED },
  { table: 'budgets', event: DATA_EVENTS.BUDGETS_CHANGED },
  { table: 'debts', event: DATA_EVENTS.DEBTS_CHANGED },
  { table: 'categories', event: DATA_EVENTS.CATEGORIES_CHANGED },
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
  const { userId } = props || {};
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

    let channel = supabase.channel(`user-sync-${userId}-${connection}`);
    for (const { table, event } of SYNCED_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        () => window.dispatchEvent(new Event(event))
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, hasSupabaseSession, connection]);

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
