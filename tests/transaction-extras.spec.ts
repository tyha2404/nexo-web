import { expect, test } from '@playwright/test';
import moment from 'moment';
import { chooseOption, openTransactionForm, setup } from './fixtures';

const FIRST = 'Ăn sáng cùng gia đình tại quán gần nhà 0';

test('undo after delete restores the same transaction', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/#/transactions');
  const view = page.locator('.content-view:visible');
  await expect(view.getByText(FIRST).locator('visible=true').first()).toBeVisible();

  await view
    .getByRole('button', { name: `Xóa ${FIRST}`, exact: true })
    .locator('visible=true')
    .first()
    .click();
  await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
  await expect(view.getByText(FIRST)).toHaveCount(0);

  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(view.getByText(FIRST).locator('visible=true').first()).toBeVisible();
  // Restored through the API (same id), not re-created as a new transaction.
  expect(state.requests).toContain('/transactions/txn-0/restore');
  expect(state.writes).toHaveLength(0);
});

test('calendar shows daily totals and filters the list to a day', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/#/transactions');
  const calendar = page.getByRole('region', { name: 'Lịch chi tiêu theo ngày' });
  const toggle = calendar.getByRole('button', { name: 'Lịch theo ngày' });
  // Open by default on desktop; collapsed on phones so the list stays in view.
  const isPhone = test.info().project.name.startsWith('iphone');
  await expect(toggle).toHaveAttribute('aria-expanded', isPhone ? 'false' : 'true');
  if (isPhone) await toggle.click();

  const today = moment();
  // 26 fixture expenses of 45.000 đ, all dated today.
  const cell = calendar.getByRole('gridcell', {
    name: new RegExp(`^${today.format('DD/MM/YYYY')}: 1\\.170\\.000`),
  });
  await expect(cell).toBeEnabled();
  await expect(cell).toContainText('1.2 tr');

  // A day without spending can't be picked.
  const otherDay = today.date() === 1 ? today.clone().date(2) : today.clone().date(1);
  await expect(
    calendar.getByRole('gridcell', { name: new RegExp(`^${otherDay.format('DD/MM/YYYY')}:`) })
  ).toBeDisabled();

  await cell.click();
  const day = today.format('YYYY-MM-DD');
  await expect
    .poll(() =>
      state.requests.some(
        (r) =>
          r.startsWith('/transactions?') &&
          r.includes(`startDate=${day}`) &&
          r.includes(`endDate=${day}`)
      )
    )
    .toBe(true);
  const clearDay = calendar.getByRole('button', { name: 'Bỏ lọc theo ngày' });
  await expect(clearDay).toBeVisible();
  if (isPhone) {
    // Picking a day folds the calendar on phones so the filtered list is in view.
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
  }
  await expect(cell).toHaveAttribute('aria-selected', 'true');

  await clearDay.click();
  await expect(clearDay).toHaveCount(0);
  await expect(cell).toHaveAttribute('aria-selected', 'false');

  // Collapsing hides the grid and is remembered.
  await toggle.click();
  await expect(calendar.getByRole('grid')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Lịch chi tiêu theo ngày' }).getByRole('grid')
  ).toHaveCount(0);
});

test('tags: add by typing and from suggestions, then filter the list by a tag', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/#/transactions');
  const view = page.locator('.content-view:visible');

  // Tapping a tag chip filters the list by it.
  await view
    .getByRole('button', { name: 'Lọc theo tag Đà Lạt' })
    .locator('visible=true')
    .first()
    .click();
  await expect(view.getByRole('button', { name: 'Bỏ lọc tag Đà Lạt' })).toBeVisible();
  await expect
    .poll(() => state.requests.some((r) => r.startsWith('/transactions?') && r.includes('tag=')))
    .toBe(true);
  await expect(view.getByText('Ăn sáng cùng gia đình tại quán gần nhà 2')).toHaveCount(0);
  await view.getByRole('button', { name: 'Bỏ lọc tag Đà Lạt' }).click();
  await expect(view.getByRole('button', { name: 'Bỏ lọc tag Đà Lạt' })).toHaveCount(0);

  // New transaction with a typed tag (matched to the known spelling) and a suggested one.
  const dialog = await openTransactionForm(page);
  await dialog.getByLabel('Số tiền (đ)', { exact: true }).fill('45000');
  await chooseOption(page, dialog, 'Danh mục', 'Ăn uống');
  const tagField = dialog.getByLabel('Tag (tùy chọn)');
  await tagField.fill('#da lat');
  await tagField.press('Enter');
  await expect(dialog).toBeVisible(); // return added the tag, it did not submit
  await dialog.getByRole('button', { name: '+ Công tác' }).click();
  await expect(dialog.getByRole('button', { name: 'Bỏ tag Đà Lạt' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Bỏ tag Công tác' })).toBeVisible();
  await dialog.getByRole('button', { name: /Thêm giao dịch/ }).click();
  await expect(dialog).toBeHidden();
  expect((state.writes.at(-1) as { tags: string[] }).tags).toEqual(['Đà Lạt', 'Công tác']);
});

/** Height of what a finger can hit: the element, or its enlarged ::after tap area. */
async function tapHeight(locator: import('@playwright/test').Locator) {
  return locator.evaluate((el) => {
    const after = getComputedStyle(el, '::after');
    const extra =
      after.content !== 'none' && after.position === 'absolute'
        ? -parseFloat(after.top) - parseFloat(after.bottom)
        : 0;
    return el.getBoundingClientRect().height + extra;
  });
}

test('new transaction controls have 44px tap areas on phones', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Tap areas are a phone concern.');
  await setup(page);
  await page.goto('/#/transactions');
  const calendar = page.getByRole('region', { name: 'Lịch chi tiêu theo ngày' });
  const toggle = calendar.getByRole('button', { name: 'Lịch theo ngày' });
  const tagChip = page
    .getByRole('button', { name: 'Lọc theo tag Đà Lạt' })
    .locator('visible=true')
    .first();
  expect(await tapHeight(toggle)).toBeGreaterThanOrEqual(44);
  expect(await tapHeight(tagChip)).toBeGreaterThanOrEqual(44);

  await toggle.click();
  const day = calendar.getByRole('gridcell', { disabled: false }).first();
  expect(await tapHeight(day)).toBeGreaterThanOrEqual(44);
  await day.click();
  expect(
    await tapHeight(calendar.getByRole('button', { name: 'Bỏ lọc theo ngày' }))
  ).toBeGreaterThanOrEqual(44);

  const dialog = await openTransactionForm(page);
  const field = dialog.getByLabel('Tag (tùy chọn)');
  await field.fill('Công tác xa');
  await field.press('Enter');
  for (const name of ['Bỏ tag Công tác xa', '+ Đà Lạt']) {
    expect(await tapHeight(dialog.getByRole('button', { name }))).toBeGreaterThanOrEqual(44);
  }
  // No sideways scrolling at phone width.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width
  );
});
