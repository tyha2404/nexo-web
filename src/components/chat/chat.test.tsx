import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import moment from 'moment';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionCard, ChatMessage, ChatStreamEvent } from '../../services';

const { chat } = vi.hoisted(() => ({
  chat: {
    confirmAction: vi.fn(),
    cancelAction: vi.fn(),
    sendStreamMessage: vi.fn(),
    getSessionMessages: vi.fn(),
    listSessions: vi.fn(async () => []),
  },
}));
vi.mock('../../services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services')>()),
  chatService: chat,
}));

const { ApiError } = await import('../../services');
const { useChatConversation } = await import('./useChatConversation');
const { ActionCardView } = await import('./ActionCardView');
const { ChatInputBar } = await import('./ChatInputBar');
const { dataEventsAfterConfirm } = await import('./actionEvents');

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const inMinutes = (minutes: number) => moment().add(minutes, 'minutes').toISOString();

const proposal = (data: Record<string, unknown> = {}): ActionCard => ({
  actionType: 'PENDING_CONFIRMATION',
  title: 'Xác nhận: Ghi chi tiêu',
  description: '45.000 ₫ - Cafe (Ăn uống)',
  data: {
    actionId: 'a1',
    toolName: 'create_transaction',
    kind: 'Ghi chi tiêu',
    status: 'PENDING',
    expiresAt: inMinutes(15),
    amount: 45000,
    type: 'EXPENSE',
    categoryName: 'Ăn uống',
    walletName: 'Tiền mặt',
    description: 'Cafe',
    date: '2026-11-11',
    isNewCategoryCreated: false,
    ...data,
  },
});

const transactionCreated: ActionCard = {
  actionType: 'TRANSACTION_CREATED',
  title: 'Đã ghi nhận Chi tiêu',
  description: '45.000 ₫ - Cafe (Ăn uống)',
  data: { id: 't1', amount: 45000, type: 'EXPENSE', category: 'Ăn uống', wallet: 'Tiền mặt' },
};

/** A hook whose conversation holds one AI reply carrying `cards`. */
async function conversationWith(cards: ActionCard[]) {
  chat.getSessionMessages.mockResolvedValue({
    id: 's1',
    title: 'Chat',
    createdAt: '',
    updatedAt: '',
    messages: [
      { id: 'm1', role: 'model', content: 'Bạn xác nhận nhé', actionCards: cards, createdAt: '' },
    ] satisfies ChatMessage[],
  });
  const hook = renderHook(() => useChatConversation());
  await act(() => hook.result.current.loadSessionMessages('s1'));
  return hook;
}

const cardData = (hook: Awaited<ReturnType<typeof conversationWith>>, index = 0) =>
  hook.result.current.messages[0].actionCards?.[index].data as Record<string, unknown>;

describe('useChatConversation: AI write proposals', () => {
  it('confirms on the server, stores the result card and refreshes the affected pages', async () => {
    chat.confirmAction.mockResolvedValue({
      actionId: 'a1',
      status: 'CONFIRMED',
      toolName: 'create_transaction',
      actionCard: transactionCreated,
    });
    const events: string[] = [];
    const record = (e: Event) => events.push(e.type);
    for (const name of ['transactions-changed', 'wallets-changed', 'categories-changed'])
      window.addEventListener(name, record);

    const hook = await conversationWith([proposal()]);
    const card = hook.result.current.messages[0].actionCards![0];
    // A double tap sends one request.
    await act(async () => {
      void hook.result.current.confirmAction(card);
      await hook.result.current.confirmAction(card);
    });

    expect(chat.confirmAction).toHaveBeenCalledOnce();
    expect(chat.confirmAction).toHaveBeenCalledWith('a1');
    expect(cardData(hook)).toMatchObject({ status: 'CONFIRMED', resultCard: transactionCreated });
    expect(hook.result.current.proposalUi.a1).toEqual({});
    expect(events).toEqual(['transactions-changed', 'wallets-changed']);
    for (const name of ['transactions-changed', 'wallets-changed', 'categories-changed'])
      window.removeEventListener(name, record);
  });

  it('cancels on the server without writing anything', async () => {
    chat.cancelAction.mockResolvedValue({ actionId: 'a1', status: 'CANCELLED', toolName: 'x' });
    const changed = vi.fn();
    window.addEventListener('transactions-changed', changed);
    const hook = await conversationWith([proposal()]);
    await act(() =>
      hook.result.current.cancelAction(hook.result.current.messages[0].actionCards![0])
    );
    expect(chat.cancelAction).toHaveBeenCalledWith('a1');
    expect(chat.confirmAction).not.toHaveBeenCalled();
    expect(cardData(hook).status).toBe('CANCELLED');
    expect(changed).not.toHaveBeenCalled();
    window.removeEventListener('transactions-changed', changed);
  });

  it('keeps a rejected proposal pending and shows the server message', async () => {
    chat.confirmAction.mockRejectedValue(new ApiError('Số dư ví không đủ', 422));
    const hook = await conversationWith([proposal()]);
    await act(() =>
      hook.result.current.confirmAction(hook.result.current.messages[0].actionCards![0])
    );
    expect(cardData(hook).status).toBe('PENDING');
    expect(hook.result.current.proposalUi.a1).toEqual({ error: 'Số dư ví không đủ' });
  });

  it('marks an expired or unknown proposal as expired, and a handled one as closed', async () => {
    const hook = await conversationWith([proposal(), proposal({ actionId: 'a2' })]);
    chat.confirmAction.mockRejectedValueOnce(new ApiError('Đề xuất đã hết hạn', 410));
    await act(() =>
      hook.result.current.confirmAction(hook.result.current.messages[0].actionCards![0])
    );
    expect(cardData(hook, 0).status).toBe('EXPIRED');

    chat.confirmAction.mockRejectedValueOnce(new ApiError('Đã xử lý', 409));
    await act(() =>
      hook.result.current.confirmAction(hook.result.current.messages[0].actionCards![1])
    );
    expect(cardData(hook, 1).status).toBe('PENDING');
    expect(hook.result.current.proposalUi.a2).toEqual({ handled: true });
  });

  it('forgets proposal state when the conversation is reset or another session is loaded', async () => {
    chat.confirmAction.mockRejectedValue(new ApiError('Lỗi', 500));
    const hook = await conversationWith([proposal()]);
    await act(() =>
      hook.result.current.confirmAction(hook.result.current.messages[0].actionCards![0])
    );
    expect(hook.result.current.proposalUi.a1).toBeDefined();
    act(() => hook.result.current.resetConversation());
    expect(hook.result.current.proposalUi).toEqual({});

    await act(() => hook.result.current.loadSessionMessages('s1'));
    await act(() =>
      hook.result.current.confirmAction(hook.result.current.messages[0].actionCards![0])
    );
    await act(() => hook.result.current.loadSessionMessages('s1'));
    expect(hook.result.current.proposalUi).toEqual({});
  });

  it('attaches every streamed card to the reply and dispatches no data event for proposals', async () => {
    chat.sendStreamMessage.mockImplementation(
      async (_req: unknown, onEvent: (e: ChatStreamEvent) => void, onComplete: () => void) => {
        onEvent({ type: 'action_card', messageId: 'm9', actionCard: proposal() });
        onEvent({ type: 'action_card', actionCard: proposal({ actionId: 'a2' }) });
        onEvent({ type: 'text_delta', delta: 'Bạn xác nhận nhé' });
        onComplete();
      }
    );
    const changed = vi.fn();
    window.addEventListener('transactions-changed', changed);
    const hook = renderHook(() => useChatConversation());
    await act(() => hook.result.current.sendMessage('Chi 45k cafe'));
    const reply = hook.result.current.messages[1];
    expect(reply).toMatchObject({ id: 'm9', content: 'Bạn xác nhận nhé', status: 'SUCCESS' });
    expect(reply.actionCards?.map((c) => (c.data as { actionId: string }).actionId)).toEqual([
      'a1',
      'a2',
    ]);
    expect(changed).not.toHaveBeenCalled();
    window.removeEventListener('transactions-changed', changed);
  });
});

describe('dataEventsAfterConfirm', () => {
  const data = (extra: Record<string, unknown>) => proposal(extra).data as never;
  it.each([
    ['create_category', ['categories-changed']],
    ['transfer_between_wallets', ['wallets-changed']],
    ['create_debt', ['debts-changed']],
    ['record_debt_repayment', ['debts-changed']],
    ['set_budget', ['budgets-changed']],
    ['set_financial_target', ['targets-changed']],
  ])('%s → %j', (toolName, events) => {
    expect(dataEventsAfterConfirm(data({ toolName }))).toEqual(events);
  });

  it('adds categories-changed when the transaction created a category', () => {
    const created = { ...transactionCreated, data: { isNewCategoryCreated: true } };
    expect(dataEventsAfterConfirm(data({}), created)).toEqual([
      'transactions-changed',
      'wallets-changed',
      'categories-changed',
    ]);
  });
});

describe('ActionCardView', () => {
  const renderCard = (card: ActionCard, ui = {}) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ActionCardView card={card} ui={ui} onConfirm={onConfirm} onCancel={onCancel} />);
    return { onConfirm, onCancel };
  };

  it('offers confirm/cancel on a pending proposal and shows its fields', () => {
    const card = proposal();
    const { onConfirm, onCancel } = renderCard(card);
    expect(screen.getByText('⏳ Chờ xác nhận')).toBeTruthy();
    expect(screen.getByText('Tiền mặt')).toBeTruthy();
    expect(screen.getByText('Ăn uống')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onConfirm).toHaveBeenCalledWith(card);
    expect(onCancel).toHaveBeenCalledWith(card);
  });

  it('disables both buttons while a request is in flight', () => {
    renderCard(proposal(), { busy: 'confirm' });
    const buttons = screen.getAllByRole('button') as HTMLButtonElement[];
    expect(buttons.map((b) => b.disabled)).toEqual([true, true]);
    expect(screen.getByText('Đang lưu...')).toBeTruthy();
  });

  it('shows the error and keeps the buttons for a retry', () => {
    renderCard(proposal(), { error: 'Số dư ví không đủ' });
    expect(screen.getByRole('alert').textContent).toBe('Số dư ví không đủ');
    expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeTruthy();
  });

  it.each([
    [
      { status: 'CONFIRMED', resultCard: transactionCreated },
      '✅ Đã xác nhận',
      'Đã xác nhận và lưu.',
    ],
    [{ status: 'CANCELLED' }, '🚫 Đã hủy', 'Đã hủy, không có dữ liệu nào được lưu.'],
    [{ status: 'EXPIRED' }, '⌛ Đã hết hạn', /Hãy nhắn lại/],
    // Still PENDING in the stored history, but past its expiry.
    [{ expiresAt: inMinutes(-1) }, '⌛ Đã hết hạn', /Hãy nhắn lại/],
  ])('%j has no buttons', (data, badge, note) => {
    renderCard(proposal(data));
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText(badge)).toBeTruthy();
    expect(screen.getByText(note)).toBeTruthy();
  });

  it('titles a confirmed proposal with the executed card', () => {
    renderCard(proposal({ status: 'CONFIRMED', resultCard: transactionCreated }));
    expect(screen.getByText('Đã ghi nhận Chi tiêu')).toBeTruthy();
  });

  it('hides the buttons of a proposal the server already handled', () => {
    renderCard(proposal(), { handled: true });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText(/đã được xử lý trước đó/)).toBeTruthy();
  });

  it('shows the fields of each proposal kind', () => {
    renderCard(
      proposal({
        toolName: 'transfer_between_wallets',
        fromWalletName: 'Techcombank',
        toWalletName: 'Tiền mặt',
        fee: 0,
      })
    );
    expect(screen.getByText('Techcombank')).toBeTruthy();
    expect(screen.queryByText('Phí:')).toBeNull();
  });
});

describe('ChatInputBar', () => {
  const setup = (value: string) => {
    const onSend = vi.fn();
    const textareaRef = createRef<HTMLTextAreaElement>();
    const props = {
      onChange: vi.fn(),
      onSend,
      isLoading: false,
      textareaRef,
      voiceSupported: false,
      isListening: false,
      onToggleVoice: vi.fn(),
    };
    const view = render(<ChatInputBar value={value} {...props} />);
    return {
      onSend,
      textareaRef,
      rerender: (v: string) => view.rerender(<ChatInputBar value={v} {...props} />),
    };
  };

  it('sends on Enter but not on the Enter that ends an IME composition (Telex)', () => {
    const { onSend } = setup('chi 45k');
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledOnce();
  });

  it('shrinks back to one row once the sent text is cleared', () => {
    const { textareaRef, rerender } = setup('dòng 1');
    Object.defineProperty(textareaRef.current!, 'scrollHeight', { value: 96, configurable: true });
    rerender('dòng 1\ndòng 2\ndòng 3');
    expect(textareaRef.current!.style.height).toBe('96px');
    rerender('');
    expect(textareaRef.current!.style.height).toBe('');
  });
});
