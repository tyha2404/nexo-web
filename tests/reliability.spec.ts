import { test, expect } from '@playwright/test';
import { setup, openTransactionForm, TOKEN, INCOME } from './fixtures';

test('dashboard shows the original sections without expanding analysis and fits the viewport', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/');
  await expect(page.getByText('Tiền khả dụng thực tế', { exact: true })).toBeVisible();
  await expect(page.getByText('Tổng tài sản:', { exact: true })).toBeVisible();
  await expect(page.getByText('Tổng Đầu tư ↗', { exact: true })).toBeVisible();
  await expect(page.getByText('Mục tiêu Đầu tư Tháng', { exact: true })).toBeVisible();
  // The mocked monthly trend is empty, and an empty trend chart is hidden
  await expect(
    page.getByText('Xu hướng Chi tiêu & Thu nhập (12 Tháng)', { exact: true })
  ).toHaveCount(0);
  await expect(page.locator('.dashboard-main-grid .recent-txns-card')).toBeVisible();
  await expect(page.locator('.dashboard-secondary-section')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem phân tích, tài sản và đầu tư' })).toHaveCount(
    0
  );
  await expect
    .poll(() => state.requests.some((path) => path.startsWith('/reports/monthly-trend')))
    .toBe(true);
  expect(state.requests.some((path) => path.startsWith('/reports/category-breakdown'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `test-results/dashboard-restored-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .locator('.dashboard-main-grid')
    .screenshot({ path: `test-results/dashboard-analysis-${test.info().project.name}.png` });
});

test('switching type clears the previous category; closing never asks about drafts', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/');
  const dialog = await openTransactionForm(page);
  await dialog.getByLabel('Số tiền (đ)', { exact: true }).fill('50000');
  await dialog.getByLabel('Danh mục').fill('Ăn uống');
  await page.getByRole('option', { name: 'Ăn uống', exact: true }).click();
  await dialog.getByRole('tab', { name: 'Thu nhập', exact: true }).click();
  await expect(dialog.getByText('Chọn Danh mục', { exact: true })).toBeVisible();
  await dialog.getByLabel('Danh mục').fill('Lương');
  await page.getByRole('option', { name: 'Lương', exact: true }).click();
  await dialog.getByRole('button', { name: 'Thêm giao dịch', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(state.writes[0].categoryId).toBe(INCOME);
  const again = await openTransactionForm(page);
  await again.getByLabel('Số tiền (đ)', { exact: true }).fill('1000');
  await again.getByRole('button', { name: 'Đóng', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => key.startsWith('nexo-draft:'))
    )
  ).toBe(false);
});

test('search reaches a transaction beyond the first page and realtime refreshes the list', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/#/transactions/expense');
  await page.getByRole('textbox', { name: 'Tìm giao dịch' }).fill('đặc biệt');
  await expect.poll(() => state.requests.some((path) => path.includes('keyword='))).toBe(true);
  await expect(
    page.getByText('Hóa đơn đặc biệt', { exact: true }).filter({ visible: true })
  ).toBeVisible();
  state.transactions[25].description = 'Hóa đơn đặc biệt mới';
  await page.evaluate(() => window.dispatchEvent(new Event('transactions-changed')));
  await expect(
    page.getByText('Hóa đơn đặc biệt mới', { exact: true }).filter({ visible: true })
  ).toBeVisible();
});

test('a network error on startup retains the token and offers retry', async ({ page }) => {
  const state = await setup(page);
  state.offline = true;
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  await expect(
    page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true })
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(TOKEN);
  state.offline = false;
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Tiền khả dụng thực tế', { exact: true })).toBeVisible();
});

test('an explicit 401 clears the expired token', async ({ page }) => {
  const state = await setup(page);
  state.unauthorized = true;
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBe(null);
});

test('a failed save keeps the form open with its values', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/');
  const dialog = await openTransactionForm(page);
  await dialog.getByLabel('Ghi chú (tùy chọn)').fill('Chưa gửi');
  await dialog.getByLabel('Số tiền (đ)', { exact: true }).fill('10000');
  await dialog.getByLabel('Danh mục').fill('Ăn uống');
  await page.getByRole('option', { name: 'Ăn uống', exact: true }).click();
  state.failSave = true;
  await dialog.getByRole('button', { name: 'Thêm giao dịch', exact: true }).click();
  await expect(page.getByText('Không lưu được', { exact: true })).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Ghi chú (tùy chọn)')).toHaveValue('Chưa gửi');
});

test('quick add from the bottom nav saves with only amount and category', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The raised + button lives in the mobile bottom nav.');
  const state = await setup(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ghi giao dịch mới' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Số tiền (đ)', { exact: true })).toBeVisible();
  await dialog.getByLabel('Số tiền (đ)', { exact: true }).fill('45000');
  await dialog.getByLabel('Danh mục').fill('Ăn uống');
  await page.getByRole('option', { name: 'Ăn uống', exact: true }).click();
  await dialog.getByRole('button', { name: /Thêm giao dịch/ }).click();
  await expect(dialog).toBeHidden();
  const saved = state.writes.at(-1) as { amount: number; description: string };
  expect(saved.amount).toBe(45000);
  expect(saved.description).toBe('Ăn uống');
});
