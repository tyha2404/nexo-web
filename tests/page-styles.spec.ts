import { test, expect } from '@playwright/test';
import { setup } from './fixtures';

// Regression: lazy page chunks used to carry shared CSS, so Debts/Planning were
// unstyled until the Transactions chunk had been loaded once.
for (const route of ['/#/debts', '/#/planning/targets', '/#/planning/categories']) {
  test(`${route} is styled on first open`, async ({ page }) => {
    await setup(page);
    await page.goto(route);
    const main = page.locator('.content-view').locator('visible=true').first();
    await expect(main.locator('h2').first()).toBeVisible();
    const snapshot = () =>
      main.evaluate((el) =>
        Array.from(el.querySelectorAll('*'))
          .slice(0, 80)
          .map((n) => {
            const cs = getComputedStyle(n);
            return [cs.display, cs.padding, cs.borderRadius, cs.backgroundColor, cs.fontSize].join(
              '|'
            );
          })
          .join('\n')
      );
    const before = await snapshot();
    await page.goto('/#/transactions');
    await expect(
      page.locator('.content-view').locator('visible=true').first().locator('h2').first()
    ).toBeVisible();
    await page.goto(route);
    expect(await snapshot()).toBe(before);
  });
}
