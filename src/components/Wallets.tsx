import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { DATA_EVENTS, DATE_FORMAT_DISPLAY, DATE_FORMAT_INPUT } from '../commons/constants';
import type { Wallet } from '../commons/types';
import { formatCompactCurrency, formatCurrency, getErrorMessage } from '../commons/utils';
import { useDataEvents } from '../hooks';
import { reportService, walletService, type WalletSummaryResponse } from '../services';
import { ConfirmModal, EmptyState, ListSkeleton, PageHeader, StatCard } from './common';
import {
  filterWallets,
  ShareBar,
  TransferModal,
  WALLET_GROUP_LABEL,
  WALLET_GROUPS,
  WALLET_TYPE_LABEL,
  walletGroupOf,
  WalletFormModal,
  type WalletFilter,
} from './wallet-list';
import {
  ALERT_ERROR,
  AlertTriangle,
  ArrowLeftRight,
  BLOCK_GAP,
  CATEGORY_BADGE,
  cx,
  MOBILE_ACTION_DELETE,
  MOBILE_ACTION_EDIT,
  MOBILE_CARD,
  MOBILE_CARD_ACTIONS,
  MOBILE_CARD_AMOUNT,
  MOBILE_CARD_AMOUNT_GROUP,
  MOBILE_CARD_FOOTER,
  MOBILE_CARD_INFO,
  MOBILE_CARD_LEFT,
  MOBILE_CARD_SUB_AMOUNT,
  MOBILE_CARD_TAGS,
  MOBILE_CARD_TITLE,
  MOBILE_CARD_TOP,
  mobileIconBadgeClass,
  PAGE_HEADER_BTN,
  PAGE_ROOT,
  Pencil,
  Plus,
  SlidingTabs,
  SUMMARY_GRID,
  tabClass,
  TABS,
  TABS_NAV,
  Trash2,
  Wallet as WalletIcon,
} from './ui';

export default function Wallets() {
  const [summary, setSummary] = useState<WalletSummaryResponse | null>(null);
  // Only the first load shows the skeleton; refreshes after a save update the list in place.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Average monthly spending (last 3 months), for the emergency-fund runway; optional.
  const [avgExpense, setAvgExpense] = useState<number | null>(null);
  const [filter, setFilter] = useState<WalletFilter>('ALL');
  const [form, setForm] = useState<{ wallet: Wallet | null } | null>(null);
  const [transfer, setTransfer] = useState<{ fromId: string | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Wallet | null>(null);

  const fetchWallets = useCallback(async () => {
    try {
      setError(null);
      const [walletSummary, trend] = await Promise.all([
        walletService.getWallets(),
        reportService.monthlyTrend(3).catch(() => null),
      ]);
      setSummary(walletSummary);
      setAvgExpense(trend?.averageExpense ?? null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể tải danh sách ví'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);
  useDataEvents([DATA_EVENTS.WALLETS_CHANGED, DATA_EVENTS.TRANSACTIONS_CHANGED], fetchWallets);

  const wallets = useMemo(() => summary?.wallets ?? [], [summary]);
  const breakdown = summary?.breakdown;
  // Tabs only for the groups the user actually has wallets in; a group that emptied out
  // falls back to the full list.
  const presentGroups = WALLET_GROUPS.filter((g) =>
    wallets.some((w) => walletGroupOf(w.type) === g)
  );
  const activeFilter = filter === 'ALL' || presentGroups.includes(filter) ? filter : 'ALL';
  const shownWallets = filterWallets(wallets, activeFilter);
  const filterTabs: { value: WalletFilter; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    ...presentGroups.map((g) => ({ value: g as WalletFilter, label: WALLET_GROUP_LABEL[g] })),
  ];
  const percentOf = (id: string) => breakdown?.byWallet.find((s) => s.key === id)?.percent;
  const groupBalance = (...keys: string[]) =>
    breakdown?.byGroup.filter((g) => keys.includes(g.key)).reduce((sum, g) => sum + g.balance, 0) ??
    0;

  const liquid = groupBalance('AVAILABLE', 'SAVINGS');
  const runwayMonths = avgExpense && avgExpense > 0 ? liquid / avgExpense : null;
  const otherCurrencies = Object.entries(summary?.totalsByCurrency ?? {}).filter(
    ([currency, total]) => currency !== (summary?.baseCurrency ?? 'VND') && total !== 0
  );
  const today = moment().format(DATE_FORMAT_INPUT);
  const daysToMaturity = (w: Wallet) =>
    w.maturityDate ? moment(w.maturityDate, DATE_FORMAT_INPUT).diff(moment(today), 'days') : null;

  const executeDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    try {
      await walletService.deleteWallet(id);
      toast.success('Đã xóa ví');
      window.dispatchEvent(new Event(DATA_EVENTS.WALLETS_CHANGED));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi khi xóa ví'));
    }
  };

  // PAGE_ROOT, not PAGE_VIEW: its stat subtitles (balance after the card, limits, the split of
  // investments) must stay visible on phones.
  return (
    <div className={PAGE_ROOT}>
      <PageHeader
        title="Ví & Số dư"
        actions={
          <>
            {wallets.length >= 2 && (
              <button className={PAGE_HEADER_BTN} onClick={() => setTransfer({ fromId: null })}>
                <ArrowLeftRight size={16} /> Chuyển tiền
              </button>
            )}
            <button className={PAGE_HEADER_BTN} onClick={() => setForm({ wallet: null })}>
              <Plus size={16} /> Thêm ví
            </button>
          </>
        }
      />

      {error && (
        <div className={cx(ALERT_ERROR, 'animate-fade-in')} role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {breakdown && breakdown.overdrawnWallets.length > 0 && (
        <div className={cx(ALERT_ERROR, 'animate-fade-in')} role="alert">
          <AlertTriangle size={16} />
          <span>
            {breakdown.overdrawnWallets
              .map((s) => `${s.label} đang âm ${formatCurrency(-s.balance)}`)
              .join('; ')}
            . Thường do chưa ghi một khoản thu hoặc chưa chuyển tiền vào ví. Số âm đã được trừ vào
            tài sản ròng.
          </span>
        </div>
      )}
      {(summary?.unlinkedTransactions ?? 0) > 0 && (
        <p className={cx(BLOCK_GAP, 'm-0 animate-fade-in text-[0.8125rem] text-muted')}>
          {summary?.unlinkedTransactions} giao dịch chưa gắn ví nên không làm thay đổi số dư ví.
          Chọn ví khi ghi giao dịch mới để số dư luôn khớp.
        </p>
      )}
      {otherCurrencies.length > 0 && (
        <p className={cx(BLOCK_GAP, 'm-0 animate-fade-in text-[0.8125rem] text-muted')}>
          Chưa tính vào tổng: ví ngoại tệ (
          {otherCurrencies.map(([c, t]) => `${c} ${t.toLocaleString('vi-VN')}`).join(', ')}).
        </p>
      )}

      {breakdown && (
        <div className={cx(SUMMARY_GRID, 'animate-fade-in')}>
          <StatCard
            title="Tài sản ròng"
            value={formatCurrency(breakdown.netWorth)}
            subtitle={
              breakdown.totalDebt > 0
                ? `Tài sản ${formatCurrency(breakdown.totalAssets)} − nợ thẻ ${formatCurrency(breakdown.totalDebt)}`
                : undefined
            }
          />
          <StatCard
            title="Tiền khả dụng"
            tone="income"
            value={formatCurrency(groupBalance('AVAILABLE'))}
            subtitle={
              breakdown.totalDebt > 0
                ? `Sau khi trả thẻ: ${formatCurrency(groupBalance('AVAILABLE') - breakdown.totalDebt)}`
                : 'Tiền mặt, ngân hàng, ví điện tử'
            }
          />
          {runwayMonths !== null && (
            <StatCard
              title="Quỹ dự phòng"
              tone={runwayMonths < 3 ? 'expense' : runwayMonths >= 6 ? 'income' : 'default'}
              value={`${runwayMonths.toFixed(1)} tháng`}
              subtitle={`Khả dụng + tiết kiệm ÷ chi tiêu TB ${formatCompactCurrency(avgExpense ?? 0)}/tháng`}
            />
          )}
          <StatCard
            title="Tiết kiệm"
            value={formatCurrency(groupBalance('SAVINGS'))}
            subtitle="Tiền gửi tiết kiệm"
          />
          <StatCard
            title="Đầu tư"
            tone="income"
            value={formatCurrency(groupBalance('INVESTMENT'))}
            subtitle={
              breakdown.investment.length > 0
                ? breakdown.investment
                    .map((s) => `${s.label} ${formatCompactCurrency(s.balance)}`)
                    .join(' · ')
                : 'Chứng chỉ tiền gửi, cổ phiếu…'
            }
          />
          {breakdown.credit.cards > 0 && (
            <StatCard
              title="Dư nợ thẻ tín dụng"
              tone="expense"
              value={formatCurrency(breakdown.credit.totalDebt)}
              subtitle={
                breakdown.credit.totalLimit > 0
                  ? `Còn ${formatCurrency(breakdown.credit.availableCredit)} / hạn mức ${formatCurrency(breakdown.credit.totalLimit)}`
                  : undefined
              }
            />
          )}
        </div>
      )}

      {breakdown && (
        <ShareBar
          title="Tiền đang nằm ở đâu"
          shares={breakdown.byGroup}
          details={{ INVESTMENT: breakdown.investment }}
        />
      )}

      <div className={`${TABS_NAV} animate-fade-in`}>
        <SlidingTabs className={TABS} role="tablist" aria-label="Lọc ví theo nhóm tài sản">
          {filterTabs.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={activeFilter === value}
              className={tabClass(activeFilter === value)}
              onClick={() => setFilter(value)}
            >
              <span>{label}</span>
            </button>
          ))}
        </SlidingTabs>
      </div>

      {loading ? (
        <ListSkeleton label="Đang tải danh sách ví" />
      ) : shownWallets.length === 0 ? (
        <EmptyState
          className="animate-fade-in"
          icon={<WalletIcon />}
          title="Chưa có ví nào"
          description="Thêm tiền mặt, MoMo, ngân hàng, tiền gửi, chứng chỉ tiền gửi, cổ phiếu, thẻ tín dụng... để theo dõi tiền của bạn đang nằm ở đâu."
          actionLabel="Thêm ví đầu tiên"
          onAction={() => setForm({ wallet: null })}
        />
      ) : (
        <div className={cx(BLOCK_GAP, 'grid animate-fade-in gap-2')}>
          {shownWallets.map((w) => {
            const pct = percentOf(w.id);
            const isCredit = w.type === 'CREDIT';
            return (
              <div key={w.id} className={MOBILE_CARD}>
                <div className={MOBILE_CARD_TOP}>
                  <div className={MOBILE_CARD_LEFT}>
                    <div className={mobileIconBadgeClass(isCredit ? 'expense' : 'income')}>
                      {w.icon ? <span>{w.icon}</span> : <WalletIcon size={16} />}
                    </div>
                    <div className={MOBILE_CARD_INFO}>
                      <div className={MOBILE_CARD_TITLE}>{w.name}</div>
                      <div className="text-[0.75rem] text-muted">{WALLET_TYPE_LABEL[w.type]}</div>
                    </div>
                  </div>
                  <div className={MOBILE_CARD_AMOUNT_GROUP}>
                    {isCredit ? (
                      <>
                        <div className={cx(MOBILE_CARD_AMOUNT, 'text-expense')}>
                          {formatCurrency(w.outstandingDebt ?? Math.abs(Math.min(w.balance, 0)))}
                        </div>
                        <div className={MOBILE_CARD_SUB_AMOUNT}>
                          {w.availableCredit !== undefined
                            ? `Còn ${formatCurrency(w.availableCredit)} / ${formatCurrency(w.creditLimit ?? 0)}`
                            : 'Dư nợ'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={MOBILE_CARD_AMOUNT}>
                          {formatCurrency(w.balance, w.currency || 'VND')}
                        </div>
                        {pct !== undefined && (
                          <div className={MOBILE_CARD_SUB_AMOUNT}>
                            {pct.toFixed(1)}% tổng tài sản
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className={MOBILE_CARD_FOOTER}>
                  <div className={MOBILE_CARD_TAGS}>
                    {w.maturityDate &&
                      (() => {
                        const days = daysToMaturity(w);
                        return (
                          <span
                            className={cx(
                              CATEGORY_BADGE,
                              days !== null && days <= 14 && 'text-warning'
                            )}
                          >
                            Đáo hạn{' '}
                            {moment(w.maturityDate, DATE_FORMAT_INPUT).format(DATE_FORMAT_DISPLAY)}
                            {days !== null &&
                              (days < 0
                                ? ' · đã quá hạn'
                                : days === 0
                                  ? ' · hôm nay'
                                  : ` · còn ${days} ngày`)}
                          </span>
                        );
                      })()}
                    {w.interestRate ? (
                      <span className={CATEGORY_BADGE}>{w.interestRate}%/năm</span>
                    ) : null}
                    {isCredit && w.statementDay ? (
                      <span className={CATEGORY_BADGE}>Sao kê ngày {w.statementDay}</span>
                    ) : null}
                    {isCredit && w.dueDay ? (
                      <span className={CATEGORY_BADGE}>Đến hạn ngày {w.dueDay}</span>
                    ) : null}
                    {!w.isIncludedInTotal && (
                      <span className={CATEGORY_BADGE}>Không tính vào tổng</span>
                    )}
                  </div>
                  <div className={MOBILE_CARD_ACTIONS}>
                    <button
                      type="button"
                      className={MOBILE_ACTION_EDIT}
                      title="Chuyển tiền từ ví này"
                      onClick={() => setTransfer({ fromId: w.id })}
                    >
                      <ArrowLeftRight size={16} /> Chuyển
                    </button>
                    <button
                      type="button"
                      className={MOBILE_ACTION_EDIT}
                      title="Sửa ví"
                      onClick={() => setForm({ wallet: w })}
                    >
                      <Pencil size={16} /> Sửa
                    </button>
                    <button
                      type="button"
                      className={MOBILE_ACTION_DELETE}
                      title="Xóa ví"
                      aria-label={`Xóa ví ${w.name}`}
                      onClick={() => setPendingDelete(w)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <WalletFormModal open={!!form} wallet={form?.wallet ?? null} onClose={() => setForm(null)} />
      <TransferModal
        open={!!transfer}
        wallets={wallets}
        fromId={transfer?.fromId ?? null}
        onClose={() => setTransfer(null)}
      />
      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Xóa ví"
        message="Bạn có chắc chắn muốn xóa ví này không? Các giao dịch cũ vẫn được giữ lại."
        confirmText="Xác nhận xóa"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
