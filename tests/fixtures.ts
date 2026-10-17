import type { Page } from '@playwright/test';
import moment from 'moment';

export const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  username: 'Test Nexo',
  email: 'test@example.invalid',
};
export const EXPENSE = '22222222-2222-4222-8222-222222222222';
export const INCOME = '33333333-3333-4333-8333-333333333333';
export const INVESTMENT = '44444444-4444-4444-8444-444444444444';
export const TOKEN = 'local-test-token';
export async function setup(page: Page) {
  const state = {
    offline: false,
    unauthorized: false,
    failSave: false,
    rejectSave: false,
    requests: [] as string[],
    writes: [] as Record<string, unknown>[],
    transactions: Array.from({ length: 26 }, (_, i) => ({
      id: `txn-${i}`,
      userId: USER.id,
      categoryId: EXPENSE,
      categoryName: 'Ăn uống',
      amount: 45000,
      type: 'EXPENSE',
      description: i === 25 ? 'Hóa đơn đặc biệt' : `Ăn sáng cùng gia đình tại quán gần nhà ${i}`,
      transactionDate: moment().format('YYYY-MM-DD'),
      receiptUrl: i === 0 ? '/icon-192.png' : '',
    })),
  };
  await page.addInitScript(
    ({ token }) => {
      if (!sessionStorage.getItem('test-initialized')) {
        localStorage.setItem('token', token);
        sessionStorage.setItem('test-initialized', 'true');
      }
    },
    { token: TOKEN }
  );
  await page.context().route('**/supabase/**', (route) => route.abort());
  await page.context().route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    state.requests.push(path + url.search);
    if (state.offline) return route.abort('internetdisconnected');
    const data = (value: unknown) => route.fulfill({ json: { success: true, data: value } });
    if (path === '/auth/whoami')
      return state.unauthorized
        ? route.fulfill({ status: 401, json: { message: 'expired' } })
        : data(USER);
    if (path === '/categories') {
      const items = [
        { id: EXPENSE, userId: USER.id, name: 'Ăn uống', type: 'EXPENSE' },
        { id: INCOME, userId: USER.id, name: 'Lương', type: 'INCOME' },
        { id: INVESTMENT, userId: USER.id, name: 'Tiết kiệm', type: 'INVESTMENT' },
      ].filter(
        (item) => !url.searchParams.get('type') || item.type === url.searchParams.get('type')
      );
      return route.fulfill({
        json: { success: true, items, total: items.length, page: 1, limit: 10 },
      });
    }
    if (path.startsWith('/transactions') && request.method() !== 'GET') {
      if (state.failSave)
        return route.fulfill({ status: 500, json: { message: 'Không lưu được' } });
      if (state.rejectSave)
        return route.fulfill({ status: 422, json: { message: 'Danh mục không hợp lệ' } });
      if (request.method() === 'DELETE') {
        state.transactions = state.transactions.filter((txn) => !path.endsWith(txn.id));
        return data({});
      }
      const payload = request.postDataJSON();
      state.writes.push(payload);
      if (request.method() === 'PUT')
        state.transactions = state.transactions.map((txn) =>
          path.endsWith(txn.id) ? { ...txn, ...payload } : txn
        );
      else
        state.transactions.unshift({
          id: `created-${state.writes.length}`,
          userId: USER.id,
          categoryName: 'Ăn uống',
          ...payload,
        });
      return data({ ...payload, id: 'saved' });
    }
    if (path === '/transactions') {
      const keyword = (url.searchParams.get('keyword') || '').toLowerCase();
      const items = state.transactions.filter(
        (item) =>
          item.description.toLowerCase().includes(keyword) &&
          (!url.searchParams.get('type') || item.type === url.searchParams.get('type'))
      );
      const pageNum = Number(url.searchParams.get('page') || 1),
        limit = Number(url.searchParams.get('limit') || 10);
      return route.fulfill({
        json: {
          success: true,
          items: items.slice((pageNum - 1) * limit, pageNum * limit),
          total: items.length,
          page: pageNum,
          limit,
          summary: { sumAmount: items.length * 45000, total: items.length },
        },
      });
    }
    if (path === '/reports/summary') {
      // A deliberately slower response for an older month tests stale-response protection.
      if (url.searchParams.get('startDate')?.startsWith('2026-08'))
        await new Promise((resolve) => setTimeout(resolve, 600));
      return data({
        totalIncome: 10000000,
        totalExpense: url.searchParams.get('startDate')?.startsWith('2026-08') ? 123 : 1170000,
        totalInvestment: 1000000,
        realizedPnL: 100000,
      });
    }
    if (path === '/reports/category-breakdown') return data({ items: [], totalExpense: 1170000 });
    if (path === '/reports/monthly-trend') return data({ items: [], averageExpense: 1170000 });
    if (path === '/targets/summary')
      return data({
        expense: {
          spentAmount: 1170000,
          targetAmount: 5000000,
          remainingAmount: 3830000,
          dailyAllowance: 100000,
          isOverBudget: false,
        },
        investment: { targetAmount: 2000000, investedAmount: 1000000, remainingAmount: 1000000 },
        daysRemaining: 15,
      });
    if (path === '/debts/summary')
      return data({ totalPayable: 0, totalReceivable: 0, overdueCount: 0, pendingCount: 0 });
    if (path === '/wallets') return data({ wallets: [] });
    if (path.startsWith('/chat')) return data([]);
    return data([]);
  });
  return state;
}
export async function openTransactionForm(page: Page) {
  await page
    .getByRole('button', { name: /^Ghi giao dịch/ })
    .locator('visible=true')
    .first()
    .click();
  return page.getByRole('dialog');
}
