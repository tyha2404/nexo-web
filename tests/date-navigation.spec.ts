import { test, expect } from '@playwright/test';
import { setup, openTransactionForm } from './fixtures';

test('date picker displays a numeric date, selects it, and preserves the transaction modal on Escape', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/');
  const modal = await openTransactionForm(page);
  const trigger = modal.getByRole('button', { name: 'Ngày thực hiện' });
  await trigger.click();
  const calendar = page.locator('.date-picker-panel');
  await expect(calendar).toBeVisible();
  await calendar.getByLabel('Chọn năm').selectOption('2026');
  await calendar.getByLabel('Chọn tháng').selectOption('9');
  await calendar
    .locator('.react-datepicker__day--018:not(.react-datepicker__day--outside-month)')
    .click();
  await expect(trigger).toHaveText('18/10/2026');
  await expect(calendar).toHaveCount(0);
  await trigger.click();
  await expect(calendar).toBeVisible();
  await calendar.evaluate((el) =>
    Promise.all(el.getAnimations().map((animation) => animation.finished))
  );
  await page.screenshot({ path: `test-results/calendar-${test.info().project.name}.png` });
  const bounds = await calendar.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  await page.keyboard.press('Escape');
  await expect(calendar).toHaveCount(0);
  await expect(modal).toBeVisible();
  await expect(trigger).toBeFocused();
});

test('month pickers use the same calendar panel in filters and target forms', async ({ page }) => {
  await setup(page);
  await page.goto('/#/planning/targets');
  await page.getByRole('button', { name: 'Tháng hiển thị' }).click();
  let calendar = page.locator('.date-picker-panel');
  await calendar.getByLabel('Chọn năm').selectOption('2027');
  await calendar.getByText('Tháng 02', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tháng hiển thị' })).toContainText('02/2027');
  await page
    .getByRole('button', { name: /Thêm mục tiêu/ })
    .first()
    .click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', { name: 'Áp dụng cho tháng' }).click();
  calendar = page.locator('.date-picker-panel');
  await expect(calendar).toBeVisible();
  await expect(calendar.getByLabel('Chọn năm')).toHaveValue('2027');
  await calendar.getByRole('button', { name: 'Xong', exact: true }).click();
  await expect(modal).toBeVisible();
});

test('navigation marks the active tab and reduced motion disables view entrances', async ({
  page,
  isMobile,
}) => {
  await setup(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const nav = page.locator(isMobile ? '.bottom-nav' : '.nav-menu');
  await nav.getByRole('button', { name: 'Giao dịch', exact: true }).click();
  await expect(nav.getByRole('button', { name: 'Giao dịch', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  const duration = await page
    .locator('.content-view')
    .filter({ visible: true })
    .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
  expect(duration).toBeLessThanOrEqual(0.01);
  await expect(page.getByPlaceholder('Tìm kiếm theo tiêu đề...')).toBeVisible();
  await page.screenshot({ path: `test-results/navigation-${test.info().project.name}.png` });
});

test('calendar stays within a short landscape viewport and follows light mode', async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 852, height: 393 });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Đổi giao diện sáng/tối' })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Tháng hiển thị' }).click();
  const calendar = page.locator('.date-picker-panel');
  await expect(calendar).toBeVisible();
  await calendar.evaluate((el) =>
    Promise.all(el.getAnimations().map((animation) => animation.finished))
  );
  const bounds = await calendar.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(393);
  expect(await calendar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const background = await calendar.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('body')).toHaveClass(/light-theme/);
  await page.screenshot({
    path: `test-results/calendar-landscape-light-${test.info().project.name}.png`,
  });
});
