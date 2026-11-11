import { expect, test, type Route } from '@playwright/test';
import moment from 'moment';
import { chooseOption, openTransactionForm, setup, USER } from './fixtures';

test('presets: save the form as a preset, reuse it with one tap, then delete it', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/');
  let dialog = await openTransactionForm(page);
  await expect(dialog.getByText('Lưu làm mẫu" để lần sau')).toBeVisible();

  await dialog.getByLabel('Số tiền (đ)').fill('35000');
  await chooseOption(page, dialog, 'Danh mục', 'Ăn uống');
  await dialog.getByLabel(/Ghi chú/).fill('Cà phê');
  await dialog.getByRole('button', { name: 'Lưu làm mẫu' }).click();
  const chip = dialog.getByRole('button', { name: 'Dùng mẫu Cà phê, 35.000 đ' });
  await expect(chip).toBeVisible();
  expect(state.presets[0]).toMatchObject({
    name: 'Cà phê',
    amount: 35000,
    type: 'EXPENSE',
    description: 'Cà phê',
  });

  // A fresh form: one tap fills amount, category and note.
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).first().click();
  dialog = await openTransactionForm(page);
  await dialog.getByRole('button', { name: 'Dùng mẫu Cà phê, 35.000 đ' }).click();
  await expect(dialog.getByLabel('Số tiền (đ)')).toHaveValue('35.000');
  await expect(dialog.getByLabel(/Ghi chú/)).toHaveValue('Cà phê');
  await expect(dialog.getByText('Ăn uống', { exact: true })).toBeVisible();

  // Presets follow the type tab.
  await dialog.getByRole('tab', { name: 'Thu nhập' }).click();
  await expect(dialog.getByRole('button', { name: /^Dùng mẫu/ })).toHaveCount(0);
  await dialog.getByRole('tab', { name: 'Chi tiêu' }).click();

  await dialog.getByRole('button', { name: 'Sửa mẫu' }).click();
  await dialog.getByRole('button', { name: 'Xóa mẫu Cà phê' }).click();
  await expect(dialog.getByRole('button', { name: /mẫu Cà phê/ })).toHaveCount(0);
  expect(state.presets).toHaveLength(0);
});

test('debts: repay in full from a wallet', async ({ page }) => {
  await setup(page);
  await page.route('**/api/v1/wallets', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          wallets: [
            { id: 'w-1', userId: USER.id, name: 'Techcombank', type: 'BANK', balance: 9000000 },
          ],
        },
      },
    })
  );
  let body: Record<string, unknown> | null = null;
  await page.route('**/api/v1/debts/*/repayments', (route: Route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ json: { success: true, data: {} } });
  });
  await page.goto('/#/debts');
  const view = page.locator('.content-view:visible');
  await view
    .getByRole('button', { name: /Trả tiền/ })
    .locator('visible=true')
    .first()
    .click();

  const dialog = page.getByRole('dialog', { name: 'Ghi nhận trả / thu tiền' });
  await dialog.getByRole('button', { name: 'Trả hết 4 tr' }).click();
  await expect(dialog.getByLabel('Số tiền trả đợt này (đ)')).toHaveValue('4.000.000');
  await expect(dialog.getByRole('button', { name: /Ngày thanh toán/ })).toContainText(
    moment().format('DD/MM/YYYY')
  );
  await chooseOption(page, dialog, 'Trả từ ví', 'Techcombank · 9 tr');
  await dialog.getByRole('button', { name: 'Xác nhận thanh toán' }).click();

  await expect.poll(() => body).not.toBeNull();
  // Today's payment leaves paidAt to the server clock.
  expect(body).toEqual({ amount: 4000000, notes: '', walletId: 'w-1' });
});

test('debts: "Đang nợ · mọi tháng" lists unsettled debts from any month, soonest due first', async ({
  page,
}) => {
  await setup(page);
  const debt = (
    id: string,
    title: string,
    start: moment.Moment,
    due: moment.Moment | null,
    done = false
  ) => ({
    id,
    userId: USER.id,
    type: 'PAYABLE',
    title,
    totalAmount: 1000000,
    paidAmount: done ? 1000000 : 0,
    remaining: done ? 0 : 1000000,
    startDate: start.format('YYYY-MM-DD'),
    dueDate: due?.format('YYYY-MM-DD'),
    status: done ? 'COMPLETED' : 'PENDING',
    repayments: [],
    createdAt: start.format(),
    updatedAt: start.format(),
  });
  const thisMonth = moment().startOf('month');
  await page.route('**/api/v1/debts', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [
          debt('a', 'Vay tháng này', thisMonth, moment().add(20, 'days')),
          debt(
            'b',
            'Vay từ 3 tháng trước',
            thisMonth.clone().subtract(3, 'months'),
            moment().add(2, 'days')
          ),
          debt('c', 'Đã trả xong', thisMonth, null, true),
        ],
      },
    })
  );
  await page.goto('/#/debts');
  const view = page.locator('.content-view:visible');
  const titles = view.locator('[class*="debts-table"] tbody tr td:first-child > div:first-child');
  const visibleTitles = async () => (await titles.allTextContents()).filter(Boolean);

  // Default: debts started this month, settled or not.
  await expect.poll(visibleTitles).toEqual(['Vay tháng này', 'Đã trả xong']);

  await chooseOption(page, view, 'Lọc theo trạng thái', 'Đang nợ · mọi tháng');
  await expect.poll(visibleTitles).toEqual(['Vay từ 3 tháng trước', 'Vay tháng này']);

  await chooseOption(page, view, 'Lọc theo trạng thái', 'Đã xong');
  await expect.poll(visibleTitles).toEqual(['Đã trả xong']);
});

test('debts: create keeps the picked day and an existing debt can be edited', async ({ page }) => {
  await setup(page);
  let created: Record<string, unknown> | null = null;
  let updated: { url: string; body: Record<string, unknown> } | null = null;
  await page.route('**/api/v1/debts', (route: Route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    created = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { success: true, data: {} } });
  });
  await page.route('**/api/v1/debts/*', (route: Route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    updated = { url: route.request().url(), body: route.request().postDataJSON() };
    return route.fulfill({ json: { success: true, data: {} } });
  });
  await page.goto('/#/debts');
  const view = page.locator('.content-view:visible');

  // Create: the picked 11/11/2026 goes out as '2026-11-11' (like transaction dates), not 10/11.
  await view.getByRole('button', { name: 'Tạo khoản nợ mới' }).click();
  let dialog = page.getByRole('dialog', { name: 'Tạo khoản nợ mới' });
  await dialog.getByLabel('Khoản nợ / Đối tác').fill('Vay chị Hoa');
  await dialog.getByLabel('Số tiền gốc (đ)').fill('3000000');
  const startTrigger = dialog.getByRole('button', { name: 'Ngày bắt đầu' });
  await startTrigger.click();
  const calendar = page.locator('.date-picker-panel');
  await calendar.getByLabel('Chọn năm').selectOption('2026');
  await calendar.getByLabel('Chọn tháng').selectOption('10');
  await calendar
    .locator('.react-datepicker__day--011:not(.react-datepicker__day--outside-month)')
    .click();
  await expect(startTrigger).toHaveText('11/11/2026');
  await dialog.getByRole('button', { name: 'Tạo khoản nợ', exact: true }).click();
  await expect.poll(() => created).not.toBeNull();
  expect(created).toMatchObject({ title: 'Vay chị Hoa', startDate: '2026-11-11' });

  // Edit: the form is prefilled and saving sends a PUT with the changes.
  await view
    .getByRole('button', { name: 'Sửa khoản Vay anh Minh' })
    .locator('visible=true')
    .first()
    .click();
  dialog = page.getByRole('dialog', { name: 'Sửa khoản nợ' });
  await expect(dialog.getByLabel('Khoản nợ / Đối tác')).toHaveValue('Vay anh Minh');
  await expect(dialog.getByLabel('Số tiền gốc (đ)')).toHaveValue('5.000.000');
  await expect(dialog.getByRole('button', { name: 'Ngày bắt đầu' })).toHaveText(
    moment().startOf('month').format('DD/MM/YYYY')
  );
  await dialog.getByLabel('Khoản nợ / Đối tác').fill('Vay anh Minh (sửa)');
  await dialog.getByLabel('Số tiền gốc (đ)').fill('6000000');
  await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect.poll(() => updated).not.toBeNull();
  expect(updated!.url).toMatch(/\/debts\/debt-payable$/);
  expect(updated!.body).toMatchObject({
    title: 'Vay anh Minh (sửa)',
    totalAmount: 6000000,
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    walletId: null,
  });
});

test('dashboard: budget box projects month-end spending at the current pace', async ({ page }) => {
  const now = moment();
  test.skip(now.date() < 3, 'No projection in the first days of the month');
  await setup(page);
  await page.goto('/');
  // Fixture: 1.170.000 đ spent so far, budget 5.000.000 đ.
  const projected = Math.round(((1170000 / now.date()) * now.daysInMonth()) / 1000) * 1000;
  const line = page.getByText('Dự kiến cả tháng:').locator('visible=true').first();
  await expect(line).toContainText(projected.toLocaleString('vi-VN'));
  await expect(line.locator('..')).toContainText(projected > 5000000 ? 'sẽ vượt' : 'trong hạn mức');
});
