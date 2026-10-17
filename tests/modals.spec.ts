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
