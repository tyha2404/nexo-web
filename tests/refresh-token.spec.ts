import { test, expect, type Page } from '@playwright/test';
import { setup, TOKEN } from './fixtures';

/** A JWT-shaped token whose `exp` is already past (the signature is never checked client-side). */
const EXPIRED_JWT = [
  'eyJhbGciOiJIUzI1NiJ9',
  Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 })).toString('base64url'),
  'sig',
].join('.');

async function startSession(page: Page, token: string, refreshToken: string) {
  await page.addInitScript(
    ({ token, refreshToken }) => {
      if (!sessionStorage.getItem('refresh-test-initialized')) {
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('refresh-test-initialized', 'true');
      }
    },
    { token, refreshToken }
  );
}

const dashboard = (page: Page) => page.getByText('Tiền khả dụng thực tế', { exact: true });

test('a 401 renews the access token once and retries the requests', async ({ page }) => {
  const state = await setup(page);
  state.expiredTokens.push(TOKEN);
  state.refreshToken = 'refresh-0';
  await startSession(page, TOKEN, 'refresh-0');

  await page.goto('/');
  await expect(dashboard(page)).toBeVisible();

  // Many requests hit the 401 at once, but they share one refresh.
  expect(state.refreshCalls).toEqual(['refresh-0']);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('fresh-token-1');
  expect(await page.evaluate(() => localStorage.getItem('refreshToken'))).toBe('refresh-1');
});

test('an access token about to expire is renewed before it is sent', async ({ page }) => {
  const state = await setup(page);
  state.expiredTokens.push(EXPIRED_JWT);
  state.refreshToken = 'refresh-0';
  await startSession(page, EXPIRED_JWT, 'refresh-0');

  await page.goto('/');
  await expect(dashboard(page)).toBeVisible();

  expect(state.refreshCalls).toEqual(['refresh-0']);
  expect(state.bearers).not.toContain(EXPIRED_JWT);
});

test('a rejected refresh token signs the user out', async ({ page }) => {
  const state = await setup(page);
  state.expiredTokens.push(TOKEN);
  state.refreshToken = 'refresh-other-device';
  await startSession(page, TOKEN, 'refresh-stolen');

  await page.goto('/');
  await expect(
    page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true })
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBe(null);
  expect(await page.evaluate(() => localStorage.getItem('refreshToken'))).toBe(null);
});

test('logging out revokes the refresh token', async ({ page }) => {
  const state = await setup(page);
  state.refreshToken = 'refresh-0';
  await startSession(page, TOKEN, 'refresh-0');

  await page.goto('/');
  await expect(dashboard(page)).toBeVisible();
  const account = page.getByRole('button', { name: 'Tài khoản' });
  await (
    (await account.isVisible())
      ? account
      : page.getByRole('button', { name: 'Cài đặt' }).filter({ visible: true }).first()
  ).click();
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();

  await expect.poll(() => state.logoutCalls).toEqual(['refresh-0']);
  expect(await page.evaluate(() => localStorage.getItem('refreshToken'))).toBe(null);
});
