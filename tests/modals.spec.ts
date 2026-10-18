import { test, expect } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { setup, openTransactionForm } from './fixtures';

// Measure after the scale-in animation settles
async function settledWidth(dialog: Locator) {
  await dialog.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  return Math.round((await dialog.boundingBox())?.width ?? 0);
}

// Category, target and transaction dialogs share the same dialog shell (app-modal-backdrop).
test('form dialogs share the same shell and close on Escape', async ({ page }) => {
  await setup(page);
  await page.goto('/');
  const widths: number[] = [];

  const tx = await openTransactionForm(page);
  await expect(page.locator('.app-modal-backdrop')).toBeVisible();
  widths.push(await settledWidth(tx));
  await page.screenshot({ path: `test-results/modal-transaction-${test.info().project.name}.png` });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/#/planning/categories');
  await page
    .getByRole('button', { name: /^Tạo danh mục/ })
    .first()
    .click();
  const cat = page.getByRole('dialog');
  await expect(cat).toBeVisible();
  await expect(page.locator('.app-modal-backdrop')).toBeVisible();
  widths.push(await settledWidth(cat));
  await page.screenshot({ path: `test-results/modal-category-${test.info().project.name}.png` });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/#/planning/targets');
  await page
    .getByRole('button', { name: /Thêm mục tiêu/ })
    .first()
    .click();
  const target = page.getByRole('dialog');
  await expect(target).toBeVisible();
  await expect(page.locator('.app-modal-backdrop')).toBeVisible();
  widths.push(await settledWidth(target));
  await page.screenshot({ path: `test-results/modal-target-${test.info().project.name}.png` });

  expect(new Set(widths).size).toBe(1);
});

// iOS can report a smaller visual viewport in standalone mode / with the keyboard.
// The scrim must still cover the layout viewport, including the home indicator.
test('modal scrim covers the screen when the visual viewport shrinks', async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => {
    if (!window.visualViewport) return;
    Object.defineProperty(window.visualViewport, 'height', {
      configurable: true,
      get: () => window.innerHeight - 180,
    });
    Object.defineProperty(window.visualViewport, 'offsetTop', {
      configurable: true,
      get: () => 20,
    });
  });
  await page.goto('/');
  const dialog = await openTransactionForm(page);
  await settledWidth(dialog);
  const bounds = await page.locator('.app-modal-backdrop').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: window.innerHeight };
  });
  expect(bounds.top).toBe(0);
  expect(bounds.bottom).toBe(bounds.height);
  const card = await dialog.boundingBox();
  expect(card!.y).toBeGreaterThanOrEqual(20);
  expect(card!.y + card!.height).toBeLessThanOrEqual(bounds.height - 160);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.position)).not.toBe('fixed');
});
