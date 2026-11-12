import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (payload: unknown) => void;
type AuthCallback = (event: string, session: unknown) => void;

const { supabaseMock, state } = vi.hoisted(() => {
  const state = {
    session: null as unknown,
    authCallback: null as AuthCallback | null,
    channels: [] as {
      name: string;
      listeners: { filter: Record<string, string>; cb: Listener }[];
    }[],
    removed: [] as string[],
  };
  const supabaseMock = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: state.session } })),
      onAuthStateChange: vi.fn((cb: AuthCallback) => {
        state.authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    channel: vi.fn((name: string) => {
      const ch = {
        name,
        listeners: [] as { filter: Record<string, string>; cb: Listener }[],
        on(_type: string, filter: Record<string, string>, cb: Listener) {
          ch.listeners.push({ filter, cb });
          return ch;
        },
        subscribe: vi.fn(),
      };
      state.channels.push(ch);
      return ch;
    }),
    removeChannel: vi.fn((ch: { name: string }) => state.removed.push(ch.name)),
  };
  return { supabaseMock, state };
});
vi.mock('../services', () => ({ supabase: supabaseMock }));

const { useRealtimeSync, REALTIME_POLL_INTERVAL_MS } = await import('./useRealtimeSync');

const USER = 'user-1';
let events: string[];
const record = (e: Event) => events.push(e.type);
const EVENTS = [
  'transactions-changed',
  'wallets-changed',
  'budgets-changed',
  'debts-changed',
  'categories-changed',
];

const setVisibility = (v: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: v });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  vi.clearAllMocks();
  state.session = null;
  state.channels = [];
  state.removed = [];
  events = [];
  EVENTS.forEach((e) => window.addEventListener(e, record));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
afterEach(() => {
  cleanup();
  EVENTS.forEach((e) => window.removeEventListener(e, record));
  vi.useRealTimers();
});

const flush = () => act(async () => {});

describe('useRealtimeSync with a Supabase session', () => {
  beforeEach(() => {
    state.session = { access_token: 'sb' };
  });

  it('subscribes to every synced table, filtered to the user', async () => {
    renderHook(() => useRealtimeSync({ userId: USER }));
    await flush();

    expect(state.channels).toHaveLength(1);
    const [channel] = state.channels;
    expect(channel.listeners.map((l) => l.filter)).toEqual(
      ['transactions', 'wallets', 'budgets', 'debts', 'categories'].map((table) => ({
        event: '*',
        schema: 'public',
        table,
        filter: `user_id=eq.${USER}`,
      }))
    );
  });

  it("a change dispatches only that table's window event", async () => {
    renderHook(() => useRealtimeSync({ userId: USER }));
    await flush();

    const wallets = state.channels[0].listeners.find((l) => l.filter.table === 'wallets')!;
    wallets.cb({});

    expect(events).toEqual(['wallets-changed']);
  });

  it('removes the channel on unmount', async () => {
    const { unmount } = renderHook(() => useRealtimeSync({ userId: USER }));
    await flush();
    unmount();
    expect(state.removed).toEqual([state.channels[0].name]);
  });

  it('reconnects and refetches everything when coming back online', async () => {
    renderHook(() => useRealtimeSync({ userId: USER }));
    await flush();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(events).toEqual(EVENTS);
    expect(state.channels).toHaveLength(2);
    expect(state.removed).toEqual([state.channels[0].name]);
  });

  it('refetches after a long background pause, not a short one', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    renderHook(() => useRealtimeSync({ userId: USER }));
    await flush();

    setVisibility('hidden');
    vi.setSystemTime(Date.now() + 10_000);
    act(() => setVisibility('visible'));
    expect(events).toEqual([]);

    setVisibility('hidden');
    vi.setSystemTime(Date.now() + 31_000);
    act(() => setVisibility('visible'));
    expect(events).toEqual(EVENTS);
  });

  it('does nothing without a user', async () => {
    renderHook(() => useRealtimeSync({}));
    await flush();
    expect(supabaseMock.auth.getSession).not.toHaveBeenCalled();
    expect(state.channels).toHaveLength(0);
  });
});

describe('useRealtimeSync without a Supabase session (Go API login)', () => {
  it('polls every minute while visible instead of subscribing', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    renderHook(() => useRealtimeSync({ userId: USER }));
    await flush();

    expect(state.channels).toHaveLength(0);
    vi.advanceTimersByTime(REALTIME_POLL_INTERVAL_MS);
    expect(events).toEqual(EVENTS);

    // Hidden: no polling.
    events = [];
    act(() => setVisibility('hidden'));
    vi.advanceTimersByTime(REALTIME_POLL_INTERVAL_MS * 3);
    expect(events).toEqual([]);
  });

  it('switches to realtime once a Supabase session appears', async () => {
    renderHook(() => useRealtimeSync({ userId: USER }));
    await flush();
    expect(state.channels).toHaveLength(0);

    act(() => state.authCallback?.('SIGNED_IN', { access_token: 'sb' }));

    expect(state.channels).toHaveLength(1);
  });
});
