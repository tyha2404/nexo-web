import { formatCurrency } from '../../commons/utils';
import type { BalanceShare } from '../../services';
import { CARD_PAD, CARD_SURFACE, cx, MONEY, SECTION_TITLE, BLOCK_GAP } from '../ui';
import { SHARE_COLORS } from './constants';

/** Stacked bar of how the total balance splits across wallets, with a legend. */
export function ShareBar({
  title,
  shares,
  details,
}: {
  title: string;
  shares: BalanceShare[];
  /** Sub-rows shown indented under the share with the same key (e.g. CDs / stocks under Đầu tư). */
  details?: Record<string, BalanceShare[]>;
}) {
  if (shares.length === 0) return null;
  return (
    <section className={cx(CARD_SURFACE, CARD_PAD, BLOCK_GAP, 'animate-fade-in')}>
      <h3 className={SECTION_TITLE}>{title}</h3>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-hover"
        role="img"
        aria-label={shares.map((s) => `${s.label} ${s.percent}%`).join(', ')}
      >
        {shares.map((s, i) => (
          <div
            key={s.key}
            style={{ width: `${s.percent}%`, background: SHARE_COLORS[i % SHARE_COLORS.length] }}
          />
        ))}
      </div>
      <ul className="m-0 mt-3 grid list-none gap-2 p-0">
        {shares.map((s, i) => (
          <li key={s.key} className="grid gap-1">
            <div className="flex min-h-6 items-center gap-2 text-[0.85rem]">
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
            </div>
            {(details?.[s.key] ?? []).length > 1 &&
              details?.[s.key].map((d) => (
                <div
                  key={d.key}
                  className="flex min-h-6 items-center gap-2 pl-[1.125rem] text-[0.8rem] text-muted"
                >
                  <span className="min-w-0 flex-1 truncate">{d.label}</span>
                  <span className={MONEY}>{d.percent.toFixed(1)}%</span>
                  <span className={cx(MONEY, 'w-28 text-right')}>{formatCurrency(d.balance)}</span>
                </div>
              ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
