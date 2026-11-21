import { expect, test } from '@playwright/test';
import { chooseOption, openTransactionForm, setup } from './fixtures';

test('wallets page splits the money by group and shows the credit card', async ({ page }) => {
  await setup(page);
  await page.goto('/#/wallets');

  await expect(page.getByRole('heading', { name: 'Ví & Số dư' })).toBeVisible();
  await expect(page.getByText('Tài sản ròng', { exact: true })).toBeVisible();
  await expect(page.getByText('Tiền khả dụng', { exact: true })).toBeVisible();
  await expect(page.getByText('Dư nợ thẻ tín dụng').locator('visible=true').first()).toBeVisible();
  await expect(page.getByText('Đến hạn ngày 5')).toBeVisible();

  // Only the groups the user has get a tab; picking one narrows the list.
  await expect(page.getByRole('tab', { name: 'Tiết kiệm' })).toHaveCount(0);
  // The investment group shows its split by type (CDs / stocks) under its row.
  await expect(page.getByText('Cổ phiếu / quỹ').locator('visible=true').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Đầu tư' }).click();
  await expect(page.getByText('60.0% tổng tài sản')).toBeVisible();
  await expect(page.getByText('40.0% tổng tài sản')).toBeHidden();
});

test('dashboard card shows assets by group and opens the wallets page', async ({ page }) => {
  await setup(page);
  await page.goto('/');

  const card = page.getByRole('button', { name: 'Số dư theo ví' });
  await expect(card).toBeVisible();
  await expect(card.getByText('Đầu tư')).toBeVisible();
  await expect(card.getByText('60.0%')).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/#\/wallets/);
});

test('an investment can name the wallet it is paid from and the wallet that holds it', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/');

  const dialog = await openTransactionForm(page);
  await dialog.getByRole('tab', { name: /Đầu tư/ }).click();
  await dialog.getByLabel('Số tiền (đ)', { exact: true }).fill('2000000');
  await chooseOption(page, dialog, 'Danh mục', 'Tiết kiệm');
  await chooseOption(page, dialog, 'Chi từ ví (tùy chọn)', 'MoMo · 4 tr');
  await chooseOption(
    page,
    dialog,
    'Ví nắm giữ (chứng chỉ tiền gửi, cổ phiếu… · tùy chọn)',
    'MB chứng chỉ tiền gửi · 6 tr'
  );
  await dialog.getByRole('button', { name: /Thêm giao dịch|Ghi giao dịch/ }).click();
  await expect(dialog).toBeHidden();

  const written = state.writes.at(-1) as { walletId: string; investmentWalletId: string };
  expect(written.walletId).toBe('w1');
  expect(written.investmentWalletId).toBe('w2');
});

test('wallets page warns about unlinked transactions, foreign currency and runway', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/#/wallets');

  await expect(page.getByText(/3 giao dịch chưa gắn ví/)).toBeVisible();
  await expect(page.getByText(/Chưa tính vào tổng: ví ngoại tệ/)).toBeVisible();
  // Liquid (4tr available + no savings) / 1.17tr average spending, and available minus the card.
  await expect(page.getByText('Quỹ dự phòng', { exact: true })).toBeVisible();
  await expect(page.getByText(/3,4 tháng|3\.4 tháng/)).toBeVisible();
  await expect(page.getByText(/Sau khi trả thẻ/)).toBeVisible();
});

test('an overdrawn wallet is flagged and not hidden', async ({ page }) => {
  const state = await setup(page);
  state.overdrawn = true;
  await page.goto('/#/wallets');

  await expect(page.getByRole('alert').filter({ hasText: 'MoMo đang âm' })).toBeVisible();
});

test('a CD wallet takes a maturity date and rate; a bank wallet does not', async ({ page }) => {
  await setup(page);
  await page.goto('/#/wallets');

  await page.getByRole('button', { name: 'Thêm ví' }).locator('visible=true').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel(/Ngày đáo hạn/)).toHaveCount(0);

  await chooseOption(page, dialog, 'Loại ví', 'Chứng chỉ tiền gửi');
  await expect(dialog.getByText('Ngày đáo hạn')).toBeVisible();
  await expect(dialog.getByLabel(/Lãi suất/)).toBeVisible();
  await expect(dialog.getByText('Giá vốn đang nắm giữ (đ)')).toBeVisible();
  await expect(dialog.getByText(/không phải giá thị trường/)).toBeVisible();
});

test('a new transaction starts on the wallet used last time', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/');

  let dialog = await openTransactionForm(page);
  await dialog.getByLabel('Số tiền (đ)', { exact: true }).fill('45000');
  await chooseOption(page, dialog, 'Danh mục', 'Ăn uống');
  await chooseOption(page, dialog, 'Chi từ ví (tùy chọn)', 'MoMo · 4 tr');
  await dialog.getByRole('button', { name: /Thêm giao dịch|Ghi giao dịch/ }).click();
  await expect(dialog).toBeHidden();
  expect((state.writes.at(-1) as { walletId: string }).walletId).toBe('w1');

  dialog = await openTransactionForm(page);
  await expect(dialog.getByText('MoMo').first()).toBeVisible();
});
