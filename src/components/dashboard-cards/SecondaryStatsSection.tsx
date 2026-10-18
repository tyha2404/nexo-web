import type { SummaryReport } from '../../commons/types';
import { formatCurrency } from '../../commons/utils';
import type { DebtSummary } from '../../types/debt';
import { CLICKABLE_GLASS_CARD, cx } from '../ui';

interface SecondaryStatsSectionProps {
  summary: SummaryReport | null;
  allTimeSummary: SummaryReport | null;
  debtSummary: DebtSummary | null;
  onNavigate?: (tab: string) => void;
}

export function SecondaryStatsSection({
  summary,
  allTimeSummary,
  debtSummary,
  onNavigate,
}: SecondaryStatsSectionProps) {
  return (
    <div className="dashboard-secondary-section animate-fade-in mb-[0.85rem] text-left">
      <div className="mb-3 text-[0.95rem] font-bold text-main">
        <span>Tài sản Tích lũy, Đầu tư & Vay Nợ</span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[0.85rem] mobile:w-full mobile:gap-2">
        {/* Investment Portfolio Card */}
        <div
          className={cx(CLICKABLE_GLASS_CARD, 'flex flex-col justify-between')}
          onClick={() => onNavigate?.('investment')}
          title="Xem chi tiết Quản lý Đầu tư"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.8rem] font-semibold text-muted">Danh mục Đầu tư ↗</span>
          </div>
          <div className="mb-1 font-mono text-[1.3rem] font-extrabold tracking-[-0.02em]">
            {formatCurrency(allTimeSummary?.totalInvestment ?? 0)}
          </div>
          <div className="text-[0.75rem] text-muted">
            <span>
              Tháng này: <strong>{formatCurrency(summary?.totalInvestment ?? 0)}</strong>
            </span>
          </div>
        </div>

        {/* Debts Payable Card */}
        <div
          className={cx(CLICKABLE_GLASS_CARD, 'flex flex-col justify-between')}
          onClick={() => onNavigate?.('debts')}
          title="Xem chi tiết các khoản nợ phải trả"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.8rem] font-semibold text-muted">Tôi Nợ (Phải Trả) ↗</span>
          </div>
          <div className="mb-1 font-mono text-[1.3rem] font-extrabold tracking-[-0.02em]">
            {formatCurrency(Math.abs(debtSummary?.totalPayable ?? 0))}
          </div>
          <div className="text-[0.75rem] text-muted">
            <span>Đang nợ người khác / thẻ tín dụng</span>
          </div>
        </div>

        {/* Debts Receivable Card */}
        <div
          className={cx(CLICKABLE_GLASS_CARD, 'flex flex-col justify-between')}
          onClick={() => onNavigate?.('debts')}
          title="Xem chi tiết các khoản cho vay / cần thu"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.8rem] font-semibold text-muted">
              Người Khác Nợ (Phải Thu) ↗
            </span>
          </div>
          <div className="mb-1 font-mono text-[1.3rem] font-extrabold tracking-[-0.02em]">
            {formatCurrency(Math.abs(debtSummary?.totalReceivable ?? 0))}
          </div>
          <div className="text-[0.75rem] text-muted">
            <span>Các khoản cho vay cần thu hồi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
