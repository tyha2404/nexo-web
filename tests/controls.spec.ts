import { expect, test } from '@playwright/test';
import { openTransactionForm, setup } from './fixtures';

for (const route of ['/#/transactions', '/#/debts', '/#/planning/targets']) {
  test(`filter controls share height and colors at ${route}`, async ({ page }) => {
    await setup(page);
    await page.goto(route);
    const filters = page.locator('.content-view:visible .filter-bar');
    await expect(filters).toBeVisible();
    for (const light of [false, true]) {
      await page.evaluate((value) => document.body.classList.toggle('light-theme', value), light);
      await expect
        .poll(() =>
          filters.evaluate((el) => {
            const nodes = [
              ...el.querySelectorAll<HTMLElement>(
                'input[placeholder^="Tìm kiếm"], .react-select__control, .month-filter-control'
              ),
            ];
            const styles = nodes.map((node) => {
              const s = getComputedStyle(node);
              return {
                height: node.getBoundingClientRect().height,
                bg: s.backgroundColor,
                border: s.borderColor,
                radius: s.borderRadius,
                color: s.color,
              };
            });
            return (
              styles.length >= 2 &&
              styles.every(
                (s) =>
                  s.height === 44 &&
                  s.bg === styles[0].bg &&
                  s.border === styles[0].border &&
                  s.radius === styles[0].radius &&
                  s.color === styles[0].color
              )
            );
          })
        )
        .toBe(true);
    }
  });
}

test('modal input, dropdown and date picker use the same control shell', async ({ page }) => {
  await setup(page);
  await page.goto('/');
  const dialog = await openTransactionForm(page);
  await expect(dialog.locator('.date-picker-trigger').first()).toBeVisible();
  const controls = dialog.locator(
    'input[inputmode="numeric"], .react-select__control, .date-picker-trigger'
  );
  await expect
    .poll(() =>
      controls.evaluateAll((nodes) => {
        const styles = nodes
          .filter((n) => n.getClientRects().length)
          .map((n) => {
            const s = getComputedStyle(n);
            return { height: s.height, bg: s.backgroundColor, radius: s.borderRadius };
          });
        return (
          styles.length >= 2 &&
          styles.every(
            (s) => s.height === '44px' && s.bg === styles[0].bg && s.radius === styles[0].radius
          )
        );
      })
    )
    .toBe(true);
});
