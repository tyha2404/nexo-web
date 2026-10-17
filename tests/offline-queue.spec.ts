import { test, expect, type Page } from '@playwright/test';
import { setup, openTransactionForm, USER, EXPENSE } from './fixtures';

const queueLength = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith('nexo-offline-queue:'));
    return key ? (JSON.parse(localStorage.getItem(key) || '[]') as unknown[]).length : 0;
  });

async function fillExpense(page: Page, amount: string, note: string) {
  const dialog = await openTransactionForm(page);
  await dialog.getByLabel('Số tiền chi tiêu (đ)').fill(amount);
  await dialog.getByLabel('Ghi chú (không bắt buộc)').fill(note);
  await dialog.getByLabel('Danh mục').fill('Ăn uống');
  await page.getByRole('option', { name: 'Ăn uống', exact: true }).click();
  return dialog;
}

test('a network failure preserves the form without queuing and allows an explicit retry', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/');
  const dialog = await fillExpense(page, '30000', 'Chưa gửi');
  state.offline = true;
  await dialog.getByRole('button', { name: 'Thêm giao dịch', exact: true }).click();
  await expect(page.locator('.Toastify__toast--error')).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Ghi chú (không bắt buộc)')).toHaveValue('Chưa gửi');
  expect(await queueLength(page)).toBe(0);
  expect(state.writes).toHaveLength(0);
  state.offline = false;
  await dialog.getByRole('button', { name: 'Thêm giao dịch', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(state.writes).toHaveLength(1);
});

test('a false browser offline signal does not block a working API', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/');
  const dialog = await fillExpense(page, '10000', 'Trực tuyến');
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { get: () => false }));
  await dialog.getByRole('button', { name: 'Thêm giao dịch', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(state.writes).toHaveLength(1);
  expect(await queueLength(page)).toBe(0);
});

test('transactions queued by an older version are still recovered', async ({ page }) => {
  const state = await setup(page);
  await page.addInitScript(
    ({ userId, categoryId }) => {
      localStorage.setItem(
        `nexo-offline-queue:${userId}`,
        JSON.stringify([
          {
            localId: 'legacy-1',
            queuedAt: '2026-10-18T00:00:00Z',
            payload: {
              amount: 20000,
              description: 'Giao dịch cũ',
              categoryId,
              type: 'EXPENSE',
              transactionDate: '2026-10-18T00:00:00Z',
            },
          },
        ])
      );
    },
    { userId: USER.id, categoryId: EXPENSE }
  );
  await page.goto('/');
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].description).toBe('Giao dịch cũ');
  await expect.poll(() => queueLength(page)).toBe(0);
});

test('without a Supabase session the app polls every minute while visible', async ({ page }) => {
  await page.clock.install();
  const state = await setup(page);
  await page.goto('/');
  await expect(page.getByText('Ngân sách còn lại', { exact: true })).toBeVisible();
  const count = () => state.requests.filter((path) => path.startsWith('/transactions?')).length;
  await page.clock.runFor(2000);
  const before = count();
  await page.clock.runFor(61_000);
  await expect.poll(count).toBeGreaterThan(before);
});
