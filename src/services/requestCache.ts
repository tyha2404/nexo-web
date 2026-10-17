import moment from 'moment';

const PREFIX = 'nexo-read-cache-v1:';
const MAX_ENTRIES = 60;
const MAX_AGE = 24 * 60 * 60 * 1000;
interface Entry {
  value: unknown;
  savedAt: number;
  path: string;
  invalidated?: boolean;
}
const memory = new Map<string, Entry>();
let revision = 0;
let scopeToken = '';
let scopePromise: Promise<string>;

export function cacheRevision() {
  return revision;
}
export async function requestCacheKey(token: string, path: string) {
  if (!scopePromise || scopeToken !== token) {
    scopeToken = token;
    scopePromise = crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(token))
      .then((buffer) =>
        Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
      );
  }
  return `${PREFIX}${await scopePromise}:${path}`;
}
export function readRequestCache(key: string, maxAge = MAX_AGE): Entry | undefined {
  try {
    const entry: Entry = memory.get(key) ?? JSON.parse(localStorage.getItem(key) || 'null');
    if (
      entry &&
      !(maxAge < MAX_AGE && entry.invalidated) &&
      moment().valueOf() - entry.savedAt <= maxAge
    )
      return entry;
  } catch {
    /* Damaged/unavailable storage must never prevent a network request. */
  }
}
export function writeRequestCache(key: string, path: string, value: unknown) {
  const entry = { value, path, savedAt: moment().valueOf() };
  memory.set(key, entry);
  if (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value!);
  try {
    const keys = Object.keys(localStorage).filter((item) => item.startsWith(PREFIX));
    if (keys.length >= MAX_ENTRIES && !keys.includes(key)) {
      const oldest = keys.sort(
        (a, b) => (readRequestCache(a)?.savedAt ?? 0) - (readRequestCache(b)?.savedAt ?? 0)
      )[0];
      localStorage.removeItem(oldest);
    }
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* Quota/private browsing: keep the in-memory copy. */
  }
}
// Invalidate affected resources rather than refetching every dashboard dependency.
export function invalidateRequestCache(resource?: string) {
  revision++;
  const related: Record<string, string[]> = {
    transactions: ['/transactions', '/reports', '/targets', '/budgets', '/alerts', '/wallets'],
    categories: ['/categories', '/transactions', '/reports', '/targets', '/budgets'],
    debts: ['/debts', '/wallets'],
    wallets: ['/wallets'],
    targets: ['/targets'],
    budgets: ['/budgets', '/categories', '/targets', '/alerts'],
  };
  const paths = resource && resource !== '*' ? related[resource] || [`/${resource}`] : undefined;
  const matches = (path: string) => !paths || paths.some((prefix) => path.startsWith(prefix));
  for (const [key, entry] of memory)
    if (matches(entry.path)) {
      if (resource) entry.invalidated = true;
      else memory.delete(key);
    }
  try {
    for (const key of Object.keys(localStorage).filter((item) => item.startsWith(PREFIX))) {
      const entry = readRequestCache(key);
      if (!entry) localStorage.removeItem(key);
      else if (matches(entry.path)) {
        if (resource) localStorage.setItem(key, JSON.stringify({ ...entry, invalidated: true }));
        else localStorage.removeItem(key);
      }
    }
  } catch {
    /* Storage may be disabled. */
  }
}
