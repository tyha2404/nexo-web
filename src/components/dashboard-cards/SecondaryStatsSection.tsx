import type { SummaryReport } from '../../commons/types';
import { formatCurrency } from '../../commons/utils';
import type { DebtSummary } from '../../types/debt';
import {
  CLICKABLE_STAT_CARD,
  SECTION_TITLE,
  statValueClass,
  SUMMARY_GRID,
  SUMMARY_STAT_HEADER,
  SUMMARY_STAT_SUBTITLE,
  SUMMARY_STAT_TITLE,
} from '../ui';

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
    <div className="dashboard-secondary-section animate-fade-in text-left">
      <h3 className={SECTION_TITLE}>Tài sản Tích lũy, Đầu tư & Vay Nợ</h3>

      <div className={SUMMARY_GRID}>
        <div
          className={CLICKABLE_STAT_CARD}
          onClick={() => onNavigate?.('investment')}
          title="Xem chi tiết Quản lý Đầu tư"
        >
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>Danh mục Đầu tư ↗</span>
          </div>
          <div className={statValueClass()}>
            {formatCurrency(allTimeSummary?.totalInvestment ?? 0)}
          </div>
          <div className={SUMMARY_STAT_SUBTITLE}>
            Tháng này: <strong>{formatCurrency(summary?.totalInvestment ?? 0)}</strong>
          </div>
        </div>
        <div
          className={CLICKABLE_STAT_CARD}
          onClick={() => onNavigate?.('debts')}
          title="Xem chi tiết các khoản nợ phải trả"
        >
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>Phải trả ↗</span>
          </div>
          <div className={statValueClass()}>
            {formatCurrency(Math.abs(debtSummary?.totalPayable ?? 0))}
          </div>
        </div>
        <div
          className={CLICKABLE_STAT_CARD}
          onClick={() => onNavigate?.('debts')}
          title="Xem chi tiết các khoản cho vay / cần thu"
        >
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>Phải thu ↗</span>
          </div>
          <div className={statValueClass()}>
            {formatCurrency(Math.abs(debtSummary?.totalReceivable ?? 0))}
          </div>
        </div>
      </div>
    </div>
  );
}
