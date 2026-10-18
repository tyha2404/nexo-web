import { CreditCard, Plus, ReceiptText } from 'lucide-react';
import moment from 'moment';
import { TransactionType } from '../../commons/constants';
import type { Transaction, Wallet as WalletModel } from '../../commons/types';
import { formatCurrency } from '../../commons/utils';

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
    <div className="glass-card dashboard-card recent-txns-card">
      <div className="card-section-header">
        <div className="card-title-wrap">
          <h3
            className="clickable-title"
            onClick={() => onNavigate?.('transactions')}
            title="Xem tất cả giao dịch"
          >
            Giao dịch Gần đây
          </h3>
        </div>
      </div>

      <div className="recent-txns-body">
        {recentTransactions.length > 0 ? (
          <div className="txns-timeline-list">
            {recentTransactions.map((txn) => {
              const matchedWallet = wallets.find((w) => w.id === txn.walletId);
              const walletLabel = txn.walletName || matchedWallet?.name || 'Ví mặc định';

              return (
                <div
                  key={txn.id}
                  className="recent-txn-row clickable-card"
                  onClick={() => onNavigate?.('transactions')}
                  title="Bấm để xem danh sách giao dịch"
                >
                  <div className="txn-left-col">
                    <div className="txn-info-meta">
                      <span className="txn-title">
                        {txn.description || txn.categoryName || 'Giao dịch'}
                      </span>
                      <div className="txn-subtags">
                        <span className="txn-cat-badge">
                          {txn.categoryName || 'Không phân loại'}
                        </span>
                        <span className="txn-wallet-badge">
                          <CreditCard size={11} /> {walletLabel}
                        </span>
                        <span className="txn-date-tag">
                          {moment(txn.transactionDate).format('DD/MM/YYYY')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="txn-right-col">
                    <span
                      className={`txn-amount-val ${
                        txn.type === TransactionType.INCOME
                          ? 'text-income'
                          : txn.type === TransactionType.INVESTMENT
                            ? ''
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
                        <span
                          className={`txn-pnl-badge ${
                            txn.realizedPnl > 0 ? 'pnl-positive' : 'pnl-negative'
                          }`}
                        >
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
          <div className="empty-state-box">
            <div className="empty-icon-circle">
              <ReceiptText size={28} className="text-muted" />
            </div>
            <p className="empty-state-title">Chưa có giao dịch nào</p>
            <p className="empty-state-sub">
              Chưa có giao dịch thu chi trong tháng{' '}
              {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}.
            </p>
            <div className="empty-actions-row">
              <button
                type="button"
                className="btn btn-primary btn-sm"
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
