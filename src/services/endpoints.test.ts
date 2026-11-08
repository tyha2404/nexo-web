import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionType } from '../commons/constants';

// Contract test: each service method must hit the route the Go API registers
// (internal/router/*_router.go) with the right method and body.
const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  request: requestMock,
}));

const { reportService } = await import('./reportService');
const { debtService } = await import('./debtService');
const { statementService } = await import('./statementService');
const { walletService } = await import('./walletService');
const { targetService } = await import('./targetService');
const { transactionService } = await import('./transactionService');
const { categoryService } = await import('./categoryService');
const { presetService } = await import('./presetService');
const { chatService } = await import('./chatService');

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockResolvedValue({});
});

type Case = [
  name: string,
  call: () => Promise<unknown>,
  path: string,
  method: string,
  body?: unknown,
];

const cases: Case[] = [
  [
    'report summary (range)',
    () => reportService.summary({ startDate: '2026-11-01', endDate: '2026-11-30' }),
    '/reports/summary?startDate=2026-11-01&endDate=2026-11-30',
    'GET',
  ],
  [
    'report summary (all time)',
    () => reportService.summary({ allTime: true }),
    '/reports/summary?allTime=true',
    'GET',
  ],
  ['report summary (default)', () => reportService.summary(), '/reports/summary', 'GET'],
  [
    'category breakdown',
    () => reportService.categoryBreakdown({ startDate: '2026-11-01', endDate: '2026-11-30' }),
    '/reports/category-breakdown?startDate=2026-11-01&endDate=2026-11-30',
    'GET',
  ],
  [
    'category breakdown needs both dates',
    () => reportService.categoryBreakdown({ startDate: '2026-11-01' }),
    '/reports/category-breakdown',
    'GET',
  ],
  ['monthly trend', () => reportService.monthlyTrend(), '/reports/monthly-trend?months=12', 'GET'],
  ['net worth', () => reportService.netWorth(24), '/reports/net-worth?months=24', 'GET'],
  ['daily report', () => reportService.daily('2026-11'), '/reports/daily?month=2026-11', 'GET'],

  ['debt summary', () => debtService.getSummary(), '/debts/summary', 'GET'],
  [
    'debts filtered',
    () => debtService.getDebts('PAYABLE' as never, 'PENDING' as never),
    '/debts?type=PAYABLE&status=PENDING',
    'GET',
  ],
  ['debts', () => debtService.getDebts(), '/debts', 'GET'],
  [
    'create debt',
    () => debtService.createDebt({ title: 'Vay' } as never),
    '/debts',
    'POST',
    { title: 'Vay' },
  ],
  [
    'repay debt',
    () => debtService.addRepayment('d1', { amount: 1000 } as never),
    '/debts/d1/repayments',
    'POST',
    { amount: 1000 },
  ],
  ['delete debt', () => debtService.deleteDebt('d1'), '/debts/d1', 'DELETE'],

  [
    'statements filtered',
    () => statementService.list({ walletId: 'w1', year: 2026, month: 11 }),
    '/credit-card-statements?walletId=w1&year=2026&month=11',
    'GET',
  ],
  ['statements', () => statementService.list(), '/credit-card-statements', 'GET'],
  ['statement', () => statementService.get('s1'), '/credit-card-statements/s1', 'GET'],
  [
    'create statement',
    () => statementService.create({ walletId: 'w1' } as never),
    '/credit-card-statements',
    'POST',
    { walletId: 'w1' },
  ],
  [
    'update statement',
    () => statementService.update('s1', { note: 'x' } as never),
    '/credit-card-statements/s1',
    'PUT',
    { note: 'x' },
  ],
  [
    'pay statement',
    () => statementService.pay('s1', { amount: 500000, sourceWalletId: 'w2' }),
    '/credit-card-statements/s1/pay',
    'POST',
    { amount: 500000, sourceWalletId: 'w2' },
  ],
  ['delete statement', () => statementService.delete('s1'), '/credit-card-statements/s1', 'DELETE'],

  ['wallets', () => walletService.getWallets(), '/wallets', 'GET'],
  ['wallet', () => walletService.getWalletById('w1'), '/wallets/w1', 'GET'],
  [
    'create wallet',
    () => walletService.createWallet({ name: 'Ví' } as never),
    '/wallets',
    'POST',
    { name: 'Ví' },
  ],
  [
    'update wallet',
    () => walletService.updateWallet('w1', { name: 'Ví 2' } as never),
    '/wallets/w1',
    'PUT',
    { name: 'Ví 2' },
  ],
  ['delete wallet', () => walletService.deleteWallet('w1'), '/wallets/w1', 'DELETE'],
  [
    'transfer',
    () => walletService.transferMoney({ fromWalletId: 'a', toWalletId: 'b', amount: 1 }),
    '/wallets/transfer',
    'POST',
    { fromWalletId: 'a', toWalletId: 'b', amount: 1 },
  ],

  [
    'target summary',
    () => targetService.getSummary({ month: 11, year: 2026 }),
    '/targets/summary?month=11&year=2026',
    'GET',
  ],
  [
    'upsert target',
    () => targetService.upsertTarget({ month: 11 } as never),
    '/targets/monthly',
    'POST',
    { month: 11 },
  ],

  [
    'transactions page',
    () => transactionService.list({ page: 1, type: TransactionType.INCOME }),
    '/transactions?page=1&type=INCOME',
    'GET',
  ],
  [
    'restore transaction',
    () => transactionService.restore('t1'),
    '/transactions/t1/restore',
    'POST',
  ],
  ['tags', () => transactionService.listTags(), '/tags', 'GET'],
  [
    'categories',
    () => categoryService.list({ type: TransactionType.EXPENSE }),
    '/categories?type=EXPENSE',
    'GET',
  ],
  ['presets', () => presetService.delete('p1'), '/presets/p1', 'DELETE'],

  ['chat sessions', () => chatService.listSessions(), '/chat/sessions', 'GET'],
  ['chat session', () => chatService.getSessionMessages('c1'), '/chat/sessions/c1', 'GET'],
  ['delete chat session', () => chatService.deleteSession('c1'), '/chat/sessions/c1', 'DELETE'],
  ['clear chat', () => chatService.clearSessions(), '/chat/clear', 'POST'],
];

describe('API endpoints', () => {
  it.each(cases)('%s', async (_name, call, path, method, body) => {
    await call();
    expect(requestMock).toHaveBeenCalledOnce();
    const [calledPath, init] = requestMock.mock.calls[0] as [string, RequestInit | undefined];
    expect(calledPath).toBe(path);
    expect(init?.method ?? 'GET').toBe(method);
    if (body === undefined) expect(init?.body).toBeUndefined();
    else expect(JSON.parse(String(init?.body))).toEqual(body);
  });

  it('encodes the month of the daily report', async () => {
    await reportService.daily('2026/11');
    expect(requestMock.mock.calls[0][0]).toBe('/reports/daily?month=2026%2F11');
  });
});
