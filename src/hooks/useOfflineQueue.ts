import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  flushOfflineQueue,
  getQueuedTransactions,
  OFFLINE_QUEUE_CHANGED_EVENT,
  type QueuedTransaction,
} from '../services';

/** Transactions waiting to be synced, kept in step with the persistent queue. */
export function useOfflineQueue(): QueuedTransaction[] {
  const [items, setItems] = useState<QueuedTransaction[]>(getQueuedTransactions);
  useEffect(() => {
    const refresh = () => setItems(getQueuedTransactions());
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return items;
}

/** Flush the offline queue on start, when the network returns and when the PWA resumes. */
export function useOfflineQueueSync(enabled: boolean) {
  const flush = useCallback(async () => {
    if (!navigator.onLine || !getQueuedTransactions().length) return;
    const { sent, dropped } = await flushOfflineQueue();
    for (const { item, message } of dropped) {
      toast.error(`Không thể đồng bộ "${item.payload.description || 'giao dịch'}": ${message}`);
    }
    if (sent) toast.success(`Đã đồng bộ ${sent} giao dịch ngoại tuyến.`);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void flush();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void flush();
    };
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    window.addEventListener('nexo-reconnect', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('nexo-reconnect', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, flush]);
}
