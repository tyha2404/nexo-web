import { expect, test, type Route } from '@playwright/test';
import moment from 'moment';
import { chooseOption, setup, USER } from './fixtures';

/** Requests whose path (with query) matches `pattern`, so far. */
const counter = (requests: string[], pattern: RegExp) => () =>
  requests.filter((r) => pattern.test(r)).length;

/** Expect exactly `expected` once requests settle (no late second refetch). */
async function expectSettled(count: () => number, expected: number) {
  await expect.poll(count).toBe(expected);
  await new Promise((resolve) => setTimeout(resolve, 500));
  expect(count()).toBe(expected);
}

test('debts: overdue tile matches the "Quá hạn" rule; a repayment refetches once, in place', async ({
  page,
}) => {
  await setup(page);
  const debt = (id: string, title: string, extra: Record<string, unknown>) => ({
    id,
    userId: USER.id,
    type: 'PAYABLE',
    title,
    totalAmount: 1000000,
    paidAmount: 0,
    remaining: 1000000,
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    status: 'PENDING',
    repayments: [],
    createdAt: moment().startOf('month').format(),
    updatedAt: moment().format(),
    ...extra,
  });
  const yesterday = moment().subtract(1, 'day');
  // Past due but not yet flagged OVERDUE by the API (it flags on read only).
  const late = debt('late', 'Vay quá hạn', {
    dueDate: yesterday.format('YYYY-MM-DD'),
    startDate: yesterday.clone().startOf('month').format('YYYY-MM-DD'),
  });
  const empty = debt('zero', 'Khoản 0 đồng', { totalAmount: 0, remaining: 0 });
  let delayRefetch = false;
  let debtFetches = 0;
  await page.route('**/api/v1/debts', async (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    debtFetches++;
    if (delayRefetch) await new Promise((resolve) => setTimeout(resolve, 600));
    return route.fulfill({ json: { success: true, data: [late, empty] } });
  });
  await page.route('**/api/v1/debts/*/repayments', (route) =>
    route.fulfill({ json: { success: true, data: {} } })
  );
  await page.goto('/#/debts');
  const view = page.locator('.content-view:visible');
  const rows = view.locator('[class*="debts-table"] tbody tr');
  // A late debt can start last month (on the 1st): list every month's open ones.
  await chooseOption(page, view, 'Lọc theo trạng thái', 'Đang nợ · mọi tháng');
  await expect(rows).toHaveCount(2);
  await expect(view.getByText('1 khoản quá hạn')).toHaveCount(1);
  // No "NaN%" for a zero total; the table and the phone cards say the same.
  for (const status of ['🚨 Quá hạn', 'Đã trả 0%'])
    await expect(view.getByText(status, { exact: true })).toHaveCount(2);

  const fetches = () => debtFetches;
  const before = fetches();
  delayRefetch = true;
  await view
    .getByRole('button', { name: /Trả tiền/ })
    .locator('visible=true')
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Ghi nhận trả / thu tiền' });
  await dialog.getByLabel('Số tiền trả đợt này (đ)').fill('100000');
  await dialog.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
  await expect(dialog).toBeHidden();
  // The list stays on screen while it refetches: no skeleton flash.
  await expect.poll(fetches).toBe(before + 1);
  await expect(view.getByLabel('Đang tải danh sách khoản vay')).toHaveCount(0);
  await expect(rows).toHaveCount(2);
  await expectSettled(fetches, before + 1);
});

test('transactions: delete and add refetch the list once', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/#/transactions');
  const view = page.locator('.content-view:visible');
  const first = 'Ăn sáng cùng gia đình tại quán gần nhà 0';
  await expect(view.getByText(first).locator('visible=true').first()).toBeVisible();
  // The page's own list (the Dashboard, mounted too, fetches its recent rows separately).
  const fetches = counter(state.requests, /^\/transactions\?type=/);
  await expectSettled(fetches, fetches());
  const before = fetches();

  await view
    .getByRole('button', { name: `Xóa ${first}`, exact: true })
    .locator('visible=true')
    .first()
    .click();
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(view.getByText(first)).toHaveCount(0);
  await expectSettled(fetches, before + 1);

  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(view.getByText(first).locator('visible=true').first()).toBeVisible();
  await expectSettled(fetches, before + 2);
});

test('targets: saving a target refreshes the Dashboard too', async ({ page }) => {
  const state = await setup(page);
  // Visit the Dashboard first so it stays mounted behind the Targets tab.
  const summaries = counter(state.requests, /^\/targets\/summary/);
  await page.goto('/');
  await expect.poll(summaries).toBeGreaterThan(0);
  await page.goto('/#/planning/targets');
  const view = page.locator('.content-view:visible');
  await view
    .getByRole('button', { name: /^(Chỉnh sửa Hạn mức Chi tiêu Tháng|Chỉnh sửa)$/ })
    .locator('visible=true')
    .first()
    .click();
  await expectSettled(summaries, summaries());
  const before = summaries();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Số tiền (đ)').fill('6000000');
  await dialog.getByRole('button', { name: 'Lưu mục tiêu' }).click();
  await expect(dialog).toBeHidden();
  expect(state.requests).toContain('/targets/monthly');
  // One reload for the Targets page, one for the Dashboard (both on 'targets-changed').
  await expectSettled(summaries, before + 2);
});
