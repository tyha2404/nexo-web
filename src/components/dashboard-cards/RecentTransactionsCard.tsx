import { CreditCard, Plus, ReceiptText } from 'lucide-react';
import moment from 'moment';
import { TransactionType } from '../../commons/constants';
import type { Transaction, Wallet as WalletModel } from '../../commons/types';
import { formatCurrency } from '../../commons/utils';
import {
  BTN_PRIMARY,
  CARD_SECTION_HEADER,
  CARD_TITLE,
  CARD_TITLE_WRAP,
  cx,
  DASHBOARD_CARD,
  EMPTY_ACTIONS,
  EMPTY_BOX,
  EMPTY_ICON_CIRCLE,
  EMPTY_SUB,
  EMPTY_TITLE,
  NO_WRAP_BADGE,
  pnlBadgeSoftClass,
  RECENT_TXN_ROW,
  TIMELINE_LIST,
  TXN_TITLE,
  WALLET_BADGE,
} from '../ui';

interface RecentTransactionsCardProps {
  selectedMonth: string;
  recentTransactions: Transaction[];
  wallets: WalletModel[];
  onNavigate?: (tab: string) => void;
}

export function RecentTransactionsCard({
  selectedMonth,
  recentTransactions,
  wallets,
  onNavigate,
}: RecentTransactionsCardProps) {
  return (
    <div className={cx('recent-txns-card', DASHBOARD_CARD, 'mobile:-order-1')}>
      <div className={CARD_SECTION_HEADER}>
        <div className={CARD_TITLE_WRAP}>
          <h3
            className={CARD_TITLE}
            onClick={() => onNavigate?.('transactions')}
            title="Xem tất cả giao dịch"
          >
            Giao dịch Gần đây
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between">
        {recentTransactions.length > 0 ? (
          <div className={TIMELINE_LIST}>
            {recentTransactions.map((txn) => {
              const matchedWallet = wallets.find((w) => w.id === txn.walletId);
              const walletLabel = txn.walletName || matchedWallet?.name || 'Ví mặc định';

              return (
                <div
                  key={txn.id}
                  className={RECENT_TXN_ROW}
                  onClick={() => onNavigate?.('transactions')}
                  title="Bấm để xem danh sách giao dịch"
                >
                  <div className="flex min-w-0 items-center gap-[0.65rem]">
                    <div className="flex min-w-0 flex-col gap-[0.15rem] text-left">
                      <span className={TXN_TITLE}>
                        {txn.description || txn.categoryName || 'Giao dịch'}
                      </span>
                      <div className="flex flex-wrap items-center gap-[0.4rem] text-[0.725rem] text-muted">
                        <span className={NO_WRAP_BADGE}>
                          {txn.categoryName || 'Không phân loại'}
                        </span>
                        {wallets.length > 1 && (
                          <span className={WALLET_BADGE}>
                            <CreditCard size={11} /> {walletLabel}
                          </span>
                        )}
                        <span className="font-mono text-[0.7rem]">
                          {moment(txn.transactionDate).format('DD/MM/YYYY')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-[0.15rem]">
                    <span
                      className={`font-mono text-[0.925rem] font-bold ${
                        txn.type === TransactionType.INCOME
                          ? 'text-income'
                          : txn.type === TransactionType.INVESTMENT
                            ? 'text-main'
                            : 'text-expense'
                      }`}
                    >
                      {txn.type === TransactionType.INCOME
                        ? `+${formatCurrency(txn.amount)}`
                        : txn.type === TransactionType.INVESTMENT
                          ? formatCurrency(txn.amount)
                          : `-${formatCurrency(txn.amount)}`}
                    </span>
                    {txn.type === TransactionType.INVESTMENT &&
                      txn.realizedPnl !== undefined &&
                      txn.realizedPnl !== 0 && (
                        <span className={pnlBadgeSoftClass(txn.realizedPnl > 0)}>
                          {txn.realizedPnl > 0 ? '+' : ''}
                          {formatCurrency(txn.realizedPnl)}
                        </span>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={EMPTY_BOX}>
            <div className={EMPTY_ICON_CIRCLE}>
              <ReceiptText size={28} className="text-muted" />
            </div>
            <p className={EMPTY_TITLE}>Chưa có giao dịch nào</p>
            <p className={EMPTY_SUB}>
              Chưa có giao dịch thu chi trong tháng{' '}
              {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}.
            </p>
            <div className={EMPTY_ACTIONS}>
              <button
                type="button"
                className={BTN_PRIMARY}
                onClick={() => onNavigate?.('expenses')}
              >
                <Plus size={14} /> Ghi giao dịch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
