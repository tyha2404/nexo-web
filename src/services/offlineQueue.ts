import { ApiError } from './client';
import { transactionService, type CreateTransactionDTO } from './transactionService';

/**
 * Persistent FIFO queue of transactions created while offline. iOS PWAs have no
 * Background Sync, so the app flushes it itself on 'online' and on resume.
 */
const PREFIX = 'nexo-offline-queue:';
/** Window event fired whenever the queue's contents change. */
export const OFFLINE_QUEUE_CHANGED_EVENT = 'offline-queue-changed';

export interface QueuedTransaction {
  localId: string;
  payload: CreateTransactionDTO;
  queuedAt: string;
}

export interface FlushResult {
  sent: number;
  dropped: { item: QueuedTransaction; message: string }[];
  remaining: number;
}

const queueKey = () => `${PREFIX}${localStorage.getItem('nexo-user-id') || 'session'}`;

const notify = () => window.dispatchEvent(new Event(OFFLINE_QUEUE_CHANGED_EVENT));

export function getQueuedTransactions(): QueuedTransaction[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(queueKey()) || '[]');
    return Array.isArray(parsed) ? (parsed as QueuedTransaction[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(items: QueuedTransaction[]) {
  if (items.length) localStorage.setItem(queueKey(), JSON.stringify(items));
  else localStorage.removeItem(queueKey());
  notify();
}

/** Remove every user's queue (logout). */
export function clearOfflineQueues() {
  try {
    for (const key of Object.keys(localStorage))
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
  } catch {
    /* Storage unavailable. */
  }
  notify();
}

let flushing: Promise<FlushResult> | null = null;

/**
 * Send queued transactions oldest-first. Stops at the first network/5xx failure
 * (kept for the next attempt); a 4xx rejection is dropped and reported.
 */
export function flushOfflineQueue(): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = (async () => {
    const result: FlushResult = { sent: 0, dropped: [], remaining: 0 };
    if (!localStorage.getItem('token')) return result;
    for (const item of getQueuedTransactions()) {
      try {
        await transactionService.create(item.payload);
        result.sent++;
      } catch (error) {
        // 401 is handled by the auth-expired flow; 408/429 are retryable.
        const rejected =
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500 &&
          ![401, 408, 429].includes(error.status);
        if (!rejected) break;
        result.dropped.push({ item, message: error.message });
      }
      saveQueue(getQueuedTransactions().filter((queued) => queued.localId !== item.localId));
    }
    result.remaining = getQueuedTransactions().length;
    if (result.sent) window.dispatchEvent(new Event('transactions-changed'));
    return result;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
