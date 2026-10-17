import { test, expect, type Page } from '@playwright/test';
import { setup, openTransactionForm } from './fixtures';

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

test('a save that cannot reach the server is queued, shown as pending and flushed when back online', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/');
  await expect(page.getByText('Ngân sách còn lại', { exact: true })).toBeVisible();
  const dialog = await fillExpense(page, '30000', 'Cà phê ngoại tuyến');
  state.offline = true;
  await dialog.getByRole('button', { name: 'Thêm giao dịch', exact: true }).click();
  await expect(dialog).toBeHidden();
  const pending = page
    .getByRole('list', { name: 'Giao dịch chờ đồng bộ' })
    .filter({ visible: true });
  await expect(pending.getByText('Cà phê ngoại tuyến')).toBeVisible();
  await expect(pending.getByText('Chờ đồng bộ')).toBeVisible();
  await expect(page.locator('.connection-status')).toContainText('Chờ đồng bộ');
  expect(await queueLength(page)).toBe(1);
  expect(state.writes).toHaveLength(0);
  // Drafts are not kept for queued saves
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => key.startsWith('nexo-draft:'))
    )
  ).toBe(false);

  // Server errors keep the item queued
  const posts = () => state.requests.filter((path) => path === '/transactions').length;
  const postsBefore = posts();
  state.offline = false;
  state.failSave = true;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(posts).toBeGreaterThan(postsBefore);
  expect(await queueLength(page)).toBe(1);

  state.failSave = false;
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0]).toMatchObject({ amount: 30000, description: 'Cà phê ngoại tuyến' });
  await expect.poll(() => queueLength(page)).toBe(0);
  await expect(page.getByRole('list', { name: 'Giao dịch chờ đồng bộ' })).toHaveCount(0);
});

test('navigator offline queues immediately and the browser online event flushes in order', async ({
  page,
  context,
}) => {
  const state = await setup(page);
  await page.goto('/');
  await expect(page.getByText('Ngân sách còn lại', { exact: true })).toBeVisible();
  for (const note of ['Thứ nhất', 'Thứ hai']) {
    // Categories come from the read cache once the API is unreachable
    const dialog = await fillExpense(page, '10000', note);
    await context.setOffline(true);
    state.offline = true;
    await dialog.getByRole('button', { name: 'Thêm giao dịch', exact: true }).click();
    await expect(dialog).toBeHidden();
    await context.setOffline(false); // the 'online' flush fails while the API stays down
  }
  await expect.poll(() => queueLength(page)).toBe(2);
  await expect(page.locator('.connection-status')).toBeVisible();
  state.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes.map((write) => write.description)).toEqual(['Thứ nhất', 'Thứ hai']);
  await expect.poll(() => queueLength(page)).toBe(0);
});

test('a 4xx rejection drops the queued item with an error toast; logout clears the queue', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/');
  await expect(page.getByText('Ngân sách còn lại', { exact: true })).toBeVisible();
  let dialog = await fillExpense(page, '20000', 'Bị từ chối');
  state.offline = true;
  await dialog.getByRole('button', { name: 'Thêm giao dịch', exact: true }).click();
  await expect(dialog).toBeHidden();
  state.offline = false;
  state.rejectSave = true;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText(/Không thể đồng bộ "Bị từ chối"/)).toBeVisible();
  await expect.poll(() => queueLength(page)).toBe(0);
  expect(state.writes).toHaveLength(0);

  state.rejectSave = false;
  dialog = await fillExpense(page, '20000', 'Chưa gửi trước khi đăng xuất');
  state.offline = true;
  await dialog.getByRole('button', { name: 'Thêm giao dịch', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(await queueLength(page)).toBe(1);
  await page.getByRole('button', { name: 'Đăng xuất' }).filter({ visible: true }).first().click();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => key.startsWith('nexo-offline-queue:'))
    )
  ).toBe(false);
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
