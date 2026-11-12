import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatStreamEvent } from './chatService';

const { requestMock, authFetchMock, saveSessionMock, endSessionMock, supabaseAuth } = vi.hoisted(
  () => ({
    requestMock: vi.fn(),
    authFetchMock: vi.fn(),
    saveSessionMock: vi.fn(),
    endSessionMock: vi.fn(),
    supabaseAuth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(
        async (): Promise<{ data: { session: { user: { email: string } } | null } }> => ({
          data: { session: null },
        })
      ),
      updateUser: vi.fn(async () => ({ error: null })),
    },
  })
);

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  request: requestMock,
  authFetch: authFetchMock,
  saveSession: saveSessionMock,
  endSession: endSessionMock,
}));
vi.mock('./supabase', () => ({ supabase: { auth: supabaseAuth } }));

const { CRUDService } = await import('./crudService');
const { authService } = await import('./authService');
const { chatService } = await import('./chatService');
const { ApiError } = await import('./client');

beforeEach(() => {
  vi.clearAllMocks();
  supabaseAuth.signOut.mockResolvedValue({ error: null });
  supabaseAuth.getSession.mockResolvedValue({ data: { session: null } });
});

describe('CRUDService', () => {
  const svc = new CRUDService<{ id: string }>('/wallets');

  it('builds the list query from defined filters only', async () => {
    requestMock.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    await svc.list({ page: 2, type: 'EXPENSE', search: '', walletId: undefined, archived: false });
    expect(requestMock).toHaveBeenCalledWith('/wallets?page=2&type=EXPENSE&archived=false', {
      method: 'GET',
    });

    await svc.list();
    expect(requestMock).toHaveBeenLastCalledWith('/wallets', { method: 'GET' });
  });

  it('wraps a plain array response in a page', async () => {
    requestMock.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await expect(svc.list()).resolves.toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      total: 2,
      page: 1,
      limit: 2,
    });
    requestMock.mockResolvedValue([]);
    await expect(svc.list()).resolves.toMatchObject({ total: 0, limit: 10 });
  });

  it('passes request options such as an abort signal', async () => {
    requestMock.mockResolvedValue([]);
    const signal = new AbortController().signal;
    await svc.list({}, { signal });
    expect(requestMock).toHaveBeenCalledWith('/wallets', { method: 'GET', signal });
  });

  it('maps get/create/update/delete to REST calls', async () => {
    requestMock.mockResolvedValue({ id: 'w1' });
    await svc.getById('w1');
    await svc.create({ id: 'new' });
    await svc.update('w1', { id: 'w1' });
    await svc.delete('w1');
    expect(requestMock.mock.calls).toEqual([
      ['/wallets/w1', { method: 'GET' }],
      ['/wallets', { method: 'POST', body: '{"id":"new"}' }],
      ['/wallets/w1', { method: 'PUT', body: '{"id":"w1"}' }],
      ['/wallets/w1', { method: 'DELETE' }],
    ]);
  });
});

describe('authService.login', () => {
  it('signs in an email through Supabase first', async () => {
    supabaseAuth.signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'sb-token' },
        user: {
          id: 'u1',
          email: 'lan@example.com',
          user_metadata: { username: 'lan' },
          created_at: 'c',
          updated_at: 'u',
        },
      },
      error: null,
    });

    const res = await authService.login('lan@example.com', 'pw123456');

    expect(res).toEqual({
      token: 'sb-token',
      user: { id: 'u1', email: 'lan@example.com', username: 'lan', createdAt: 'c', updatedAt: 'u' },
    });
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('falls back to the Go API (dropping any Supabase session) when Supabase rejects', async () => {
    supabaseAuth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'bad' } });
    requestMock.mockResolvedValue({ token: 't', refreshToken: 'r', user: { id: 'u' } });

    await authService.login('lan@example.com', 'pw123456');

    expect(supabaseAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(requestMock).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'lan@example.com', password: 'pw123456' }),
    });
  });

  it('sends a username straight to the Go API', async () => {
    requestMock.mockResolvedValue({ token: 't' });
    await authService.login('lan', 'pw123456');
    expect(supabaseAuth.signInWithPassword).not.toHaveBeenCalled();
    expect(JSON.parse(requestMock.mock.calls[0][1].body)).toEqual({
      username: 'lan',
      password: 'pw123456',
    });
  });
});

describe('authService.register', () => {
  it('registers through Supabase with the username in metadata', async () => {
    supabaseAuth.signUp.mockResolvedValue({
      data: { user: { id: 'u1', created_at: 'c' } },
      error: null,
    });
    await expect(authService.register('lan', 'lan@example.com', 'pw123456')).resolves.toMatchObject(
      {
        id: 'u1',
        username: 'lan',
      }
    );
    expect(supabaseAuth.signUp).toHaveBeenCalledWith({
      email: 'lan@example.com',
      password: 'pw123456',
      options: { data: { username: 'lan' } },
    });
  });

  it('surfaces Supabase errors', async () => {
    supabaseAuth.signUp.mockResolvedValue({
      data: {},
      error: { message: 'User already registered' },
    });
    await expect(authService.register('lan', 'lan@example.com', 'pw')).rejects.toThrow(
      'User already registered'
    );
  });
});

describe('authService.changePassword', () => {
  it('stores the new session the API returns for local accounts', async () => {
    requestMock.mockResolvedValue({ message: 'Password changed', token: 't2', refreshToken: 'r2' });
    await authService.changePassword('old-password', 'new-password');
    expect(saveSessionMock).toHaveBeenCalledWith({ token: 't2', refreshToken: 'r2' });
  });

  it('maps a 400 to a "wrong current password" message', async () => {
    requestMock.mockRejectedValue(new ApiError('Current password is incorrect', 400));
    await expect(authService.changePassword('wrong', 'new-password')).rejects.toThrow(
      'Mật khẩu hiện tại không đúng.'
    );
    expect(saveSessionMock).not.toHaveBeenCalled();
  });

  it('re-authenticates Supabase accounts before updating the password there', async () => {
    supabaseAuth.getSession.mockResolvedValue({
      data: { session: { user: { email: 'lan@example.com' } } },
    });
    supabaseAuth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid' } });
    await expect(authService.changePassword('wrong', 'new-password')).rejects.toThrow(
      'Mật khẩu hiện tại không đúng.'
    );
    expect(supabaseAuth.updateUser).not.toHaveBeenCalled();

    supabaseAuth.signInWithPassword.mockResolvedValue({ error: null });
    await authService.changePassword('right', 'new-password');
    expect(supabaseAuth.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
    expect(requestMock).not.toHaveBeenCalled();
  });
});

describe('authService.logout', () => {
  it('ends the API session synchronously, then signs out of Supabase', () => {
    void authService.logout();
    expect(endSessionMock).toHaveBeenCalledOnce();
    expect(supabaseAuth.signOut).toHaveBeenCalled();
  });
});

describe('chatService.sendStreamMessage', () => {
  /** A streamed body delivered in the given chunks. */
  const streamOf = (chunks: string[]) =>
    new Response(
      new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          chunks.forEach((c) => controller.enqueue(enc.encode(c)));
          controller.close();
        },
      })
    );

  async function run(response: Response | Error) {
    if (response instanceof Error) authFetchMock.mockRejectedValue(response);
    else authFetchMock.mockResolvedValue(response);
    const events: ChatStreamEvent[] = [];
    const onComplete = vi.fn();
    const onError = vi.fn();
    await chatService.sendStreamMessage(
      { message: 'Chi tiêu tháng này?' },
      (e) => events.push(e),
      onComplete,
      onError
    );
    return { events, onComplete, onError };
  }

  it('parses SSE events, including ones split across chunks and a final unterminated line', async () => {
    const { events, onComplete, onError } = await run(
      streamOf([
        'data: {"type":"session_info","sessionId":"s1"}\n\n',
        'data: {"type":"text_del',
        'ta","delta":"Xin "}\n\ndata: {"type":"text_delta","delta":"chào"}\n',
        ': keep-alive comment\n\n',
        'data: not-json\n\n',
        'data: {"type":"done"}',
      ])
    );

    expect(events).toEqual([
      { type: 'session_info', sessionId: 's1' },
      { type: 'text_delta', delta: 'Xin ' },
      { type: 'text_delta', delta: 'chào' },
      { type: 'done' },
    ]);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it('posts the message through authFetch so the token is renewed', async () => {
    await run(streamOf([]));
    expect(authFetchMock).toHaveBeenCalledWith(
      '/chat/stream',
      expect.objectContaining({
        method: 'POST',
        headers: { Accept: 'text/event-stream' },
        body: JSON.stringify({ message: 'Chi tiêu tháng này?' }),
      })
    );
  });

  it('reports HTTP errors with the server text', async () => {
    const { onError, onComplete } = await run(new Response('Quá nhiều yêu cầu', { status: 429 }));
    expect(onError).toHaveBeenCalledWith(new ApiError('Quá nhiều yêu cầu', 429));
    expect(onError.mock.calls[0][0].status).toBe(429);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('reads the message of a JSON error envelope, like request()', async () => {
    const body = JSON.stringify({
      status: 400,
      success: false,
      message: 'Tin nhắn quá dài',
      error: 'invalid input',
    });
    const { onError } = await run(new Response(body, { status: 400 }));
    expect(onError.mock.calls[0][0]).toBeInstanceOf(ApiError);
    expect(onError.mock.calls[0][0].message).toBe('Tin nhắn quá dài: invalid input');
  });

  it('dispatches auth-expired on a 401 of a signed-in session', async () => {
    const expired = vi.fn();
    window.addEventListener('auth-expired', expired);
    try {
      localStorage.setItem('token', 'tok');
      const { onError } = await run(
        new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
      );
      expect(expired).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0][0]).toMatchObject({ status: 401, message: 'Unauthorized' });

      localStorage.removeItem('token');
      await run(new Response('{}', { status: 401 }));
      expect(expired).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener('auth-expired', expired);
      localStorage.clear();
    }
  });

  it('turns an abort into a Vietnamese timeout message', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const { onError } = await run(abort);
    expect(onError.mock.calls[0][0].message).toContain('quá thời gian chờ');
  });

  it('passes other failures through', async () => {
    const { onError } = await run(new TypeError('Failed to fetch'));
    expect(onError).toHaveBeenCalledWith(new TypeError('Failed to fetch'));
  });
});
