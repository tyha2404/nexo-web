import { expect, test } from '@playwright/test';
import { setup } from './fixtures';

test('list entrances release transforms and respect reduced motion', async ({ page }) => {
  await setup(page);
  await page.goto('/#/transactions');
  const main = page.locator('.content-view:visible');
  const rows = main.locator('tbody tr:visible, .transaction-mobile-card:visible');
  await expect(rows.first()).toBeVisible();
  await expect
    .poll(() => rows.first().evaluate((el) => getComputedStyle(el).animationName))
    .toMatch(/fadeIn|nexo-item-enter/);
  await rows.first().evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  expect(await rows.first().evaluate((el) => getComputedStyle(el).transform)).toBe('none');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(rows.first()).toBeVisible();
  expect(await rows.first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  expect(await main.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

test('tab indicator slides to the selected tab and follows resizing', async ({ page }) => {
  await setup(page);
  await page.goto('/#/transactions');
  const tabs = page.getByRole('tablist', {
    name: 'Phân loại giao dịch (Chi tiêu, Thu nhập, Đầu tư)',
  });
  const indicator = tabs.locator('[data-tab-indicator]');
  await expect(indicator).toBeVisible();
  const before = await indicator.evaluate((el) => getComputedStyle(el).transform);
  const income = tabs.getByRole('tab', { name: 'Thu nhập' });
  await income.click();
  await expect(income).toHaveAttribute('aria-selected', 'true');
  await expect
    .poll(() => indicator.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before);
  const aligned = async () => {
    const a = await indicator.boundingBox();
    const b = await income.boundingBox();
    return Math.abs(a!.x - b!.x) < 2 && Math.abs(a!.width - b!.width) < 2;
  };
  await expect.poll(aligned).toBe(true);
  await page.setViewportSize({ width: 560, height: 800 });
  await expect.poll(aligned).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await indicator.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))
  ).toBeLessThan(0.001);
});
