import type { DebtSummary, SummaryReport } from '../../commons/types';
import { formatCurrency } from '../../commons/utils';
import { StatCard } from '../common';
import { SECTION_TITLE, SUMMARY_GRID } from '../ui';

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
        <StatCard
          title="Danh mục Đầu tư ↗"
          hint="Xem chi tiết Quản lý Đầu tư"
          onClick={() => onNavigate?.('investment')}
          value={formatCurrency(allTimeSummary?.totalInvestment ?? 0)}
          subtitle={
            <>
              Tháng này: <strong>{formatCurrency(summary?.totalInvestment ?? 0)}</strong>
            </>
          }
        />
        <StatCard
          title="Phải trả ↗"
          hint="Xem chi tiết các khoản nợ phải trả"
          onClick={() => onNavigate?.('debts')}
          value={formatCurrency(Math.abs(debtSummary?.totalPayable ?? 0))}
        />
        <StatCard
          title="Phải thu ↗"
          hint="Xem chi tiết các khoản cho vay / cần thu"
          onClick={() => onNavigate?.('debts')}
          value={formatCurrency(Math.abs(debtSummary?.totalReceivable ?? 0))}
        />
      </div>
    </div>
  );
}
