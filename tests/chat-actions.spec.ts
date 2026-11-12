import { expect, test, type Page, type Route } from '@playwright/test';
import moment from 'moment';
import { setup } from './fixtures';

/** A PENDING_CONFIRMATION card as chat_write_proposals.go streams it. */
const proposal = (extra: Record<string, unknown> = {}) => ({
  actionType: 'PENDING_CONFIRMATION',
  title: 'Xác nhận: Ghi chi tiêu',
  description: '45.000 ₫ - Cafe (Ăn uống)',
  data: {
    actionId: 'a1',
    toolName: 'create_transaction',
    kind: 'Ghi chi tiêu',
    status: 'PENDING',
    expiresAt: moment().add(15, 'minutes').toISOString(),
    amount: 45000,
    type: 'EXPENSE',
    categoryName: 'Ăn uống',
    walletName: 'Tiền mặt',
    description: 'Cafe',
    date: moment().format('YYYY-MM-DD'),
    isNewCategoryCreated: false,
    ...extra,
  },
});

const sse = (events: object[]) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');

/** Streams one reply that proposes a transaction. */
async function mockProposalStream(page: Page) {
  await page.route('**/api/v1/chat/stream', (route) =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: sse([
        { type: 'session_info', sessionId: 's1', messageId: 'm1' },
        { type: 'action_card', messageId: 'm1', actionCard: proposal() },
        { type: 'text_delta', messageId: 'm1', delta: 'Bạn kiểm tra và bấm Xác nhận nhé.' },
        { type: 'done', messageId: 'm1', status: 'SUCCESS' },
      ]),
    })
  );
}

async function openChatAndAsk(page: Page) {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Trợ lý AI', exact: true })
    .filter({ visible: true })
    .click();
  const chat = page.locator('.nexo-chat-window');
  await chat.locator('.chat-input-textarea').fill('Chi 45k cafe');
  await chat.locator('.chat-input-textarea').press('Enter');
  const card = chat.getByTestId('chat-action-card');
  await expect(card).toContainText('⏳ Chờ xác nhận');
  return { chat, card };
}

test('chat: confirming a proposal runs it on the server and refreshes the pages', async ({
  page,
  isMobile,
}) => {
  const state = await setup(page);
  await mockProposalStream(page);
  const calls: string[] = [];
  await page.route('**/api/v1/chat/actions/*/confirm', async (route: Route) => {
    calls.push(route.request().url());
    // Slow enough to see the busy state.
    await new Promise((resolve) => setTimeout(resolve, 300));
    return route.fulfill({
      json: {
        success: true,
        data: {
          actionId: 'a1',
          status: 'CONFIRMED',
          toolName: 'create_transaction',
          actionCard: {
            actionType: 'TRANSACTION_CREATED',
            title: 'Đã ghi nhận Chi tiêu',
            description: '45.000 ₫ - Cafe (Ăn uống)',
            data: { id: 't-new', amount: 45000, type: 'EXPENSE', category: 'Ăn uống' },
          },
        },
      },
    });
  });
  const { card } = await openChatAndAsk(page);
  await expect(card).toContainText('Tiền mặt');

  const confirm = card.getByRole('button', { name: 'Xác nhận' });
  if (isMobile) {
    for (const button of [confirm, card.getByRole('button', { name: 'Hủy' })])
      // Layout height: the card may still be scaling in with its fade-in animation.
      expect(
        await button.evaluate((el) => (el as HTMLElement).offsetHeight)
      ).toBeGreaterThanOrEqual(44);
  }
  const listFetches = () => state.requests.filter((r) => r.startsWith('/transactions?')).length;
  const before = listFetches();
  await confirm.click();
  await expect(card.getByRole('button', { name: 'Đang lưu...' })).toBeDisabled();
  await expect(card).toContainText('✅ Đã xác nhận');
  await expect(card).toContainText('Đã ghi nhận Chi tiêu');
  await expect(card.getByRole('button')).toHaveCount(0);

  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatch(/\/chat\/actions\/a1\/confirm$/);
  // Nothing was written through /transactions by the web app itself.
  expect(state.writes).toHaveLength(0);
  // transactions-changed made the (always mounted) Dashboard reload its recent transactions.
  await expect.poll(listFetches).toBeGreaterThan(before);
});

test('chat: cancel discards the proposal; a rejected confirm shows the server message', async ({
  page,
}) => {
  const state = await setup(page);
  await mockProposalStream(page);
  let confirms = 0;
  await page.route('**/api/v1/chat/actions/*/confirm', (route) => {
    confirms++;
    return route.fulfill({
      status: 422,
      json: {
        status: 422,
        success: false,
        message: 'Số dư ví không đủ',
        error: 'pending action failed: Số dư ví không đủ',
      },
    });
  });
  let cancels = 0;
  await page.route('**/api/v1/chat/actions/*/cancel', (route) => {
    cancels++;
    return route.fulfill({
      json: {
        success: true,
        data: { actionId: 'a1', status: 'CANCELLED', toolName: 'create_transaction' },
      },
    });
  });
  const { card } = await openChatAndAsk(page);

  await card.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(card.getByRole('alert')).toHaveText('Số dư ví không đủ');
  // Still pending: it can be retried or cancelled.
  await expect(card).toContainText('⏳ Chờ xác nhận');

  await card.getByRole('button', { name: 'Hủy' }).click();
  await expect(card).toContainText('🚫 Đã hủy');
  await expect(card).toContainText('không có dữ liệu nào được lưu');
  await expect(card.getByRole('button')).toHaveCount(0);
  expect({ confirms, cancels, writes: state.writes.length }).toEqual({
    confirms: 1,
    cancels: 1,
    writes: 0,
  });
});

test('chat: a reloaded session shows the stored outcome of each proposal', async ({ page }) => {
  await setup(page);
  const stored = [
    proposal({ status: 'CONFIRMED' }),
    proposal({ actionId: 'a2', status: 'PENDING', expiresAt: moment().subtract(1, 'hour') }),
  ];
  await page.route('**/api/v1/chat/sessions', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [
          { id: 's1', title: 'Cafe', createdAt: moment().format(), updatedAt: moment().format() },
        ],
      },
    })
  );
  await page.route('**/api/v1/chat/sessions/s1', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 's1',
          title: 'Cafe',
          messages: [
            { id: 'u1', role: 'user', content: 'Chi 45k cafe', createdAt: moment().format() },
            {
              id: 'm1',
              role: 'model',
              content: 'Bạn kiểm tra và bấm Xác nhận nhé.',
              status: 'SUCCESS',
              toolResults: JSON.stringify(stored),
              createdAt: moment().format(),
            },
          ],
        },
      },
    })
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Trợ lý AI', exact: true })
    .filter({ visible: true })
    .click();
  const cards = page.locator('.nexo-chat-window').getByTestId('chat-action-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('✅ Đã xác nhận');
  await expect(cards.nth(1)).toContainText('⌛ Đã hết hạn');
  await expect(cards.getByRole('button')).toHaveCount(0);
});
