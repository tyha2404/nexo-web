import { clickableProps, formatCurrency } from '../../commons/utils';
import type { WalletBreakdown } from '../../services';
import { BLOCK_GAP, CARD_PAD, CARD_SURFACE, cx, MONEY, SECTION_TITLE } from '../ui';
// Deep import (not the wallet-list barrel): keeps the wallet modals out of the dashboard bundle.
import { SHARE_COLORS } from '../wallet-list/constants';

interface WalletBalanceCardProps {
  breakdown: WalletBreakdown | null;
  onNavigate?: (tab: string) => void;
}

/** Where the money sits: assets by group (available, savings, CDs, stocks…) plus credit-card debt. */
export function WalletBalanceCard({ breakdown, onNavigate }: WalletBalanceCardProps) {
  if (!breakdown || (breakdown.byGroup.length === 0 && breakdown.credit.cards === 0)) return null;
  const rows = breakdown.byGroup;

  return (
    <section
      className={cx(CARD_SURFACE, CARD_PAD, BLOCK_GAP, 'animate-fade-in cursor-pointer text-left')}
      aria-label="Số dư theo ví"
      title="Xem chi tiết Ví & Số dư"
      {...clickableProps(() => onNavigate?.('wallets'))}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className={cx(SECTION_TITLE, 'mb-0')}>Tài sản theo nhóm ↗</h3>
        <span className={cx(MONEY, 'text-[0.95rem] font-bold text-main')}>
          {formatCurrency(breakdown.totalAssets)}
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-hover" aria-hidden="true">
        {rows.map((s, i) => (
          <div
            key={s.key}
            style={{ width: `${s.percent}%`, background: SHARE_COLORS[i % SHARE_COLORS.length] }}
          />
        ))}
      </div>
      <ul className="m-0 mt-3 grid list-none gap-1.5 p-0">
        {rows.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2 text-[0.85rem]">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: SHARE_COLORS[i % SHARE_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-main">
              {s.label}
              {s.count > 1 && <span className="text-muted"> · {s.count} ví</span>}
            </span>
            <span className={cx(MONEY, 'text-muted')}>{s.percent.toFixed(1)}%</span>
            <span className={cx(MONEY, 'w-28 text-right text-main')}>
              {formatCurrency(s.balance)}
            </span>
          </li>
        ))}
      </ul>
      {breakdown.credit.cards > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2 text-[0.85rem]">
          <span className="text-muted">Dư nợ thẻ tín dụng</span>
          <span className={cx(MONEY, 'text-expense')}>
            {formatCurrency(breakdown.credit.totalDebt)}
          </span>
        </div>
      )}
    </section>
  );
}
