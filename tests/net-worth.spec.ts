import { expect, test, type Page } from '@playwright/test';
import moment from 'moment';
import { setup } from './fixtures';

/** 12 month-end points ending this month, starting from `opening`. */
function report(opening: number, changes: number[]) {
  let running = opening;
  const start = moment()
    .startOf('month')
    .subtract(changes.length - 1, 'months');
  const items = changes.map((change, i) => {
    running += change;
    const m = start.clone().add(i, 'months');
    return {
      month: m.format('YYYY-MM'),
      label: `T${m.format('MM/YY')}`,
      income: Math.max(change, 0) + 10_000_000,
      expense: 10_000_000 - Math.min(change, 0),
      realizedPnL: 0,
      change,
      netWorth: running,
    };
  });
  return { items, opening, current: running, periodChange: running - opening };
}

async function mockNetWorth(page: Page, body: unknown) {
  await page.route('**/api/v1/reports/net-worth*', (route) =>
    route.fulfill({ json: { success: true, data: body } })
  );
}

test('dashboard: net worth card shows the current figure, the period change and a data table', async ({
  page,
}) => {
  await setup(page);
  const data = report(
    80_000_000,
    [
      4_000_000, 3_500_000, -2_000_000, 5_000_000, 4_200_000, 1_000_000, -6_000_000, 3_000_000,
      4_500_000, 2_800_000, 3_300_000, 1_700_000,
    ]
  );
  await mockNetWorth(page, data);
  await page.goto('/');

  const card = page.getByRole('region', { name: 'Tài sản ròng' }).locator('visible=true');
  await expect(card).toBeVisible();
  await expect(card).toContainText('105.000.000');
  // +25.000.000 over 80.000.000 opening = +31.3%, with an arrow, not colour alone.
  await expect(card).toContainText('▲ +25.000.000');
  await expect(card).toContainText('(+31.3%)');
  await expect(card).toContainText(`so với đầu tháng ${data.items[0].label.slice(1)}`);

  // Screen readers get every month as a table row.
  const rows = card.locator('table tbody tr');
  await expect(rows).toHaveCount(12);
  await expect(rows.last()).toContainText('105.000.000');
  await expect(rows.nth(6)).toContainText('−6.000.000');
});

test('dashboard: net worth card stays hidden without any data', async ({ page }) => {
  await setup(page);
  await mockNetWorth(page, report(0, Array(12).fill(0)));
  await page.goto('/');
  await expect(page.getByText('Tổng Chi tiêu').locator('visible=true').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Tài sản ròng' })).toHaveCount(0);
});
