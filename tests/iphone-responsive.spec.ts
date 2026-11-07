import { test, expect } from '@playwright/test';
import { setup, openTransactionForm } from './fixtures';

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Phone layout checks');
  await setup(page);
});

test('form scrolls independently above the save actions, including a short viewport', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await openTransactionForm(page);
  for (const height of [659, 350]) {
    await page.setViewportSize({ width: 393, height });
    const body = dialog.locator('.modal-form-body');
    await body.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const footer = dialog.locator('.button-group');
    await expect(footer).toBeVisible();
    const bounds = await body.boundingBox();
    const actions = await footer.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(actions!.y + 1);
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(height);
    expect(await footer.evaluate((el) => getComputedStyle(el).paddingBottom)).toBe('12px');
    expect(await body.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await body.evaluate((el) => getComputedStyle(el).overflowX)).toBe('hidden');
  }
  await page.screenshot({ path: 'test-results/iphone-form-short.png' });
});

test('landscape retains bottom navigation and transaction cards', async ({ page }) => {
  await page.setViewportSize({ width: 852, height: 393 });
  await page.goto('/#/transactions/expense');
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.transactions-mobile-cards').filter({ visible: true })).toBeVisible();
  await expect(page.locator('.transactions-table-container').filter({ visible: true })).toHaveCount(
    0
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/iphone-landscape.png' });
});

test('chat follows the visible keyboard viewport and resets after closing', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Trợ lý AI', exact: true })
    .filter({ visible: true })
    .click();
  const chat = page.locator('.nexo-chat-window');
  await expect(chat).toBeVisible();
  // WebKit emulation has no native keyboard; model its VisualViewport events.
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: 320 });
    Object.defineProperty(window.visualViewport!, 'offsetTop', { configurable: true, value: 40 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect.poll(async () => Math.round((await chat.boundingBox())!.height)).toBe(320);
  const input = page.locator('.chat-input-textarea');
  await input.fill('Kiểm tra bàn phím');
  // Measure after the sheet's slide-up entrance animation (finite) has finished
  await chat.evaluate((el) =>
    Promise.all(
      el
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished)
    )
  );
  const bounds = await input.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(40);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(360);
  await page.screenshot({ path: 'test-results/iphone-chat-keyboard.png' });
  await page.keyboard.press('Escape');
  await expect(chat).toBeHidden();
  await page.evaluate(() => {
    Reflect.deleteProperty(window.visualViewport!, 'height');
    Reflect.deleteProperty(window.visualViewport!, 'offsetTop');
  });
  await page
    .getByRole('button', { name: 'Trợ lý AI', exact: true })
    .filter({ visible: true })
    .click();
  await expect(chat).toBeVisible();
  await expect.poll(async () => (await chat.boundingBox())!.height).toBeGreaterThan(320);
});

test('login uses compact spacing and fits phone width', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('token'));
  await page.goto('/');
  const card = page.locator('.auth-container');
  await expect(card).toBeVisible();
  expect(
    await page.locator('.auth-outer-container').evaluate((el) => getComputedStyle(el).paddingLeft)
  ).toBe('16px');
  expect(await card.evaluate((el) => getComputedStyle(el).paddingLeft)).toBe('20px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/iphone-login.png', fullPage: true });
});

test('month filter shows the year and navigates across year boundaries', async ({ page }) => {
  await page.goto('/');
  const month = page.getByRole('button', { name: 'Tháng hiển thị' });
  await month.click();
  const calendar = page.locator('.date-picker-panel');
  await calendar.getByLabel('Chọn năm').selectOption('2026');
  await calendar.getByText('Tháng 12', { exact: true }).click();
  await expect(month).toContainText('12/2026');
  await page.getByRole('button', { name: 'Tháng kế tiếp', exact: true }).click();
  await expect(month).toContainText('01/2027');
  await page.getByRole('button', { name: 'Tháng trước', exact: true }).click();
  await expect(month).toContainText('12/2026');
  const arrow = await page.getByRole('button', { name: 'Tháng trước', exact: true }).boundingBox();
  expect(arrow!.width).toBeGreaterThanOrEqual(44);
  expect(arrow!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'test-results/iphone-month-filter.png' });
});

test('date inputs remain inside a vertically scrolling transaction modal', async ({ page }) => {
  await page.goto('/');
  const dialog = await openTransactionForm(page);
  const date = dialog.getByLabel('Ngày thực hiện');
  await date.click();
  const calendar = page.locator('.date-picker-panel');
  await calendar.getByLabel('Chọn năm').selectOption('2026');
  await calendar.getByLabel('Chọn tháng').selectOption('11');
  await calendar
    .locator('.react-datepicker__day--031:not(.react-datepicker__day--outside-month)')
    .click();
  await expect(date).toContainText('31/12/2026');
  await date.scrollIntoViewIfNeeded();
  const bounds = await date.boundingBox();
  const modal = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(modal!.x);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(modal!.x + modal!.width);
  await page.screenshot({ path: 'test-results/iphone-date-modal.png' });
});

test('opening a form keeps the page scrollable-height: scroll lock via overflow, not a fixed body', async ({
  page,
}) => {
  // A fixed body leaves the page without scrollable height, which made iOS home-screen apps
  // end the viewport 59px above the screen bottom under the sheet.
  await page.goto('/');
  await expect(page.getByText('Tiền khả dụng thực tế', { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 200));
  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled).toBeGreaterThan(0);

  const dialog = await openTransactionForm(page);
  // The lock is applied in an effect, just after the sheet paints.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.overflow))
    .toBe('hidden');
  const locked = await page.evaluate(() => ({
    html: document.documentElement.style.overflow,
    position: getComputedStyle(document.body).position,
    pageHeight: document.documentElement.scrollHeight,
    scrollY: window.scrollY,
  }));
  expect(locked.html).toBe('hidden');
  expect(locked.position).not.toBe('fixed');
  expect(locked.pageHeight).toBeGreaterThan(page.viewportSize()!.height);
  expect(locked.scrollY).toBe(scrolled);
  // The sheet still fills the viewport, actions at the bottom.
  const footer = (await dialog.locator('.button-group').boundingBox())!;
  expect(Math.round(footer.y + footer.height)).toBe(page.viewportSize()!.height);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const after = await page.evaluate(() => ({
    html: document.documentElement.style.overflow,
    body: document.body.style.overflow,
    scrollY: window.scrollY,
  }));
  expect(after).toEqual({ html: '', body: '', scrollY: scrolled });
});

const themeColor = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.querySelector('meta[name="theme-color"]')!.getAttribute('content'));

for (const theme of ['dark', 'light'] as const) {
  test(`${theme} theme: a full-screen sheet paints the status bar in its own top colour`, async ({
    page,
  }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto('/');
    await expect(page.getByText('Tiền khả dụng thực tế', { exact: true })).toBeVisible();
    const titlebar = theme === 'light' ? '#f8f8f8' : '#181818';
    await expect.poll(() => themeColor(page)).toBe(titlebar);

    const dialog = await openTransactionForm(page);
    const header = await dialog
      .locator('.modal-header')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    await expect.poll(() => themeColor(page)).toBe(header);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await themeColor(page)).toBe(titlebar);
  });
}

test('a saved light theme reaches the status bar before the app bundle runs', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  // Without the app bundle, only public/theme-init.js can have set these.
  await page.route('**/assets/*.js', (route) => route.abort());
  await page.goto('/');
  expect(await themeColor(page)).toBe('#f8f8f8');
  expect(
    await page.evaluate(() => document.documentElement.classList.contains('light-theme'))
  ).toBe(true);
});
