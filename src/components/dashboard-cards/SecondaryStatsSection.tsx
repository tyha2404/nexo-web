import type { SummaryReport } from '../../commons/types';
import { formatCurrency } from '../../commons/utils';
import type { DebtSummary } from '../../types/debt';

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
    <div className="dashboard-secondary-section animate-fade-in">
      <div className="secondary-section-title">
        <span>Tài sản Tích lũy, Đầu tư & Vay Nợ</span>
      </div>

      <div className="secondary-cards-grid">
        {/* Investment Portfolio Card */}
        <div
          className="secondary-stat-card glass-card clickable-card"
          onClick={() => onNavigate?.('investment')}
          title="Xem chi tiết Quản lý Đầu tư"
        >
          <div className="secondary-card-head">
            <span className="secondary-card-label">Danh mục Đầu tư ↗</span>
          </div>
          <div className="secondary-card-value">
            {formatCurrency(allTimeSummary?.totalInvestment ?? 0)}
          </div>
          <div className="secondary-card-sub">
            <span>
              Tháng này: <strong>{formatCurrency(summary?.totalInvestment ?? 0)}</strong>
            </span>
          </div>
        </div>

        {/* Debts Payable Card */}
        <div
          className="secondary-stat-card glass-card clickable-card"
          onClick={() => onNavigate?.('debts')}
          title="Xem chi tiết các khoản nợ phải trả"
        >
          <div className="secondary-card-head">
            <span className="secondary-card-label">Tôi Nợ (Phải Trả) ↗</span>
          </div>
          <div className="secondary-card-value">
            {formatCurrency(Math.abs(debtSummary?.totalPayable ?? 0))}
          </div>
          <div className="secondary-card-sub">
            <span>Đang nợ người khác / thẻ tín dụng</span>
          </div>
        </div>

        {/* Debts Receivable Card */}
        <div
          className="secondary-stat-card glass-card clickable-card"
          onClick={() => onNavigate?.('debts')}
          title="Xem chi tiết các khoản cho vay / cần thu"
        >
          <div className="secondary-card-head">
            <span className="secondary-card-label">Người Khác Nợ (Phải Thu) ↗</span>
          </div>
          <div className="secondary-card-value">
            {formatCurrency(Math.abs(debtSummary?.totalReceivable ?? 0))}
          </div>
          <div className="secondary-card-sub">
            <span>Các khoản cho vay cần thu hồi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
