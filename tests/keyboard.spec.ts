import { expect, test, type Page } from '@playwright/test';
import { selectControl, setup } from './fixtures';

// WebKit emulation has no on-screen keyboard: model it the way iOS reports it, as a
// visual viewport that shrinks by the keyboard height (the layout viewport never resizes).
async function showKeyboard(page: Page, height = 300) {
  await page.evaluate((keyboard) => {
    const vv = window.visualViewport!;
    Object.defineProperty(vv, 'height', {
      configurable: true,
      value: window.innerHeight - keyboard,
    });
    Object.defineProperty(vv, 'offsetTop', { configurable: true, value: 0 });
    vv.dispatchEvent(new Event('resize'));
  }, height);
}
async function hideKeyboard(page: Page) {
  await page.evaluate(() => {
    const vv = window.visualViewport!;
    Reflect.deleteProperty(vv, 'height');
    Reflect.deleteProperty(vv, 'offsetTop');
    vv.dispatchEvent(new Event('resize'));
  });
}

test.beforeEach(({ isMobile }) => {
  test.skip(!isMobile, 'On-screen keyboard behaviour is phone-only.');
});

test('quick add keeps the keyboard on the amount field and dropdowns never open it', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ghi giao dịch mới' }).click();
  const dialog = page.getByRole('dialog');
  const amount = dialog.getByLabel('Số tiền (đ)', { exact: true });
  // useModal used to move focus to the dialog a frame later, closing the keyboard again.
  await page.waitForTimeout(300);
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAttribute('inputmode', 'numeric');
  await expect(amount).toHaveAttribute('autocomplete', 'off');
  // Category picker: tap-only on phones (no search box, so no keyboard over its menu).
  await expect(dialog.getByLabel('Danh mục')).toHaveAttribute('inputmode', 'none');
  await expect(selectControl(dialog, 'Danh mục')).toBeVisible();
});

test('return moves to the next field instead of submitting', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ghi giao dịch mới' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Số tiền (đ)', { exact: true }).fill('45000');
  await page.keyboard.press('Enter');
  await expect(dialog.getByLabel('Ghi chú (tùy chọn)')).toBeFocused();
  await expect(dialog).toBeVisible();
  expect(state.writes).toHaveLength(0);
});

test('the focused field stays above the keyboard and a tap on empty space hides it', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ghi giao dịch mới' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await showKeyboard(page, 340);
  const note = dialog.getByLabel('Ghi chú (tùy chọn)');
  await note.focus();
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  const footer = dialog.locator('.button-group');
  await expect
    .poll(async () => {
      const field = (await note.boundingBox())!;
      const bar = (await footer.boundingBox())!;
      return field.y >= 0 && field.y + field.height <= bar.y;
    })
    .toBe(true);
  // Save buttons sit right above the keyboard.
  const bar = (await footer.boundingBox())!;
  expect(bar.y + bar.height).toBeLessThanOrEqual(
    (await page.evaluate(() => innerHeight)) - 340 + 1
  );

  await dialog.locator('.modal-form-body').dispatchEvent('pointerdown', { pointerType: 'touch' });
  await expect(note).not.toBeFocused();
  await hideKeyboard(page);
});

test('the bottom nav hides while typing in a page search box', async ({ page }) => {
  await setup(page);
  await page.goto('/#/transactions');
  const nav = page.locator('.bottom-nav');
  await expect(nav).toBeVisible();
  const search = page.getByRole('textbox', { name: 'Tìm giao dịch' }).locator('visible=true');
  await expect(search).toHaveAttribute('enterkeyhint', 'search');
  await search.focus();
  await showKeyboard(page);
  await expect(nav).toBeHidden();
  await page.keyboard.press('Enter'); // "Tìm" hides the keyboard
  await expect(search).not.toBeFocused();
  await hideKeyboard(page);
  await expect(nav).toBeVisible();
});
