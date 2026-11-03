import moment from 'moment';
import { TransactionType } from '../../commons/constants';
import type { ActionCard } from '../../services';
import { CheckIcon, UndoIcon } from './ChatIcons';
import type { ActionCardData } from './types';
import { BTN_TRANSITION, NO_WRAP } from './chatStyles';

/** Left accent per action type (it also wins over the light-theme border). */
const ACCENTS: Record<string, string> = {
  TRANSACTION_CREATED: 'border-l-income light:border-l-income',
  TRANSACTION_PROPOSED: 'border-l-income light:border-l-income',
  PENDING_CONFIRMATION: 'border-l-income light:border-l-income',
  DEBT_REPAID: 'border-l-income light:border-l-income',
  CATEGORY_CREATED: 'border-l-purple light:border-l-purple',
  BUDGET_SET: 'border-l-purple light:border-l-purple',
  KNOWLEDGE_SOURCE: 'border-l-purple light:border-l-purple',
  WALLET_TRANSFER: 'border-l-primary light:border-l-primary',
  FINANCIAL_SUMMARY: 'border-l-primary light:border-l-primary',
  DEBT_CREATED: 'border-l-warning light:border-l-warning',
  BUDGET_ALERT: 'border-l-warning light:border-l-warning',
};

const META_ITEM = 'inline-flex items-center gap-[5px] text-[11px]';
const META_LABEL = 'text-[var(--text-muted)] font-medium light:text-[var(--text-muted)]';
// The old markup also carried the global `.tag` class (no-wrap), hence NO_WRAP.
const META_TAG = `font-semibold text-primary bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] py-px px-[6px] rounded-xs text-[10.5px] ${NO_WRAP}`;
const CARD_BTN = `inline-flex items-center gap-[5px] py-[6px] px-3 rounded-sm text-[11.5px] font-semibold cursor-pointer ${BTN_TRANSITION}`;

const ACTION_BADGES: Record<string, string> = {
  TRANSACTION_CREATED: '💸 Ghi chép thành công',
  TRANSACTION_PROPOSED: '📝 Đề xuất ghi chép',
  PENDING_CONFIRMATION: '⏳ Chờ xác nhận',
  CATEGORY_CREATED: '🏷️ Danh mục mới',
  WALLET_TRANSFER: '🔄 Chuyển tiền ví',
  DEBT_CREATED: '🤝 Ghi nhận vay/nợ',
  DEBT_REPAID: '💵 Trả/Thu nợ',
  BUDGET_SET: '🎯 Thiết lập ngân sách',
  BUDGET_ALERT: '⚠️ Cảnh báo ngân sách',
  KNOWLEDGE_SOURCE: '📖 Tri thức tài chính',
  FINANCIAL_SUMMARY: '📊 Tổng quan tài chính',
};

export interface ActionCardViewProps {
  card: ActionCard;
  createdAt?: string;
  feedback?: string;
  onConfirm: (data: ActionCardData | undefined) => void;
  onCancel: () => void;
  onUndo: (data: ActionCardData | undefined) => void;
}

/** Interactive card attached to an AI reply (created/proposed transaction, budget, ...). */
export function ActionCardView({
  card,
  createdAt,
  feedback,
  onConfirm,
  onCancel,
  onUndo,
}: ActionCardViewProps) {
  const data = card.data as ActionCardData | undefined;
  const isIncome = data?.type === TransactionType.INCOME;
  return (
    <div
      className={`mt-[10px] py-3 px-[14px] rounded-md flex flex-col gap-[6px] bg-[rgba(0,0,0,0.7)] border border-[rgba(255,255,255,0.1)] border-l-[3.5px] shadow-[0_4px_16px_rgba(0,0,0,0.25)] light:bg-white light:border-[var(--border)] light:shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${ACCENTS[card.actionType] ?? 'border-l-[var(--income)]'}`}
    >
      <div className="flex items-center justify-between gap-2 mb-[2px]">
        <div
          className={`text-[11px] font-bold text-[var(--text-main)] light:text-[var(--text-main)] ${NO_WRAP}`}
        >
          <span>{ACTION_BADGES[card.actionType] ?? '⚡ Hành động AI'}</span>
        </div>
        <span className="text-[10px] text-muted">{moment(createdAt).format('HH:mm')}</span>
      </div>

      <div className="text-[12px] font-semibold text-[var(--text-main)] light:text-[var(--text-main)]">
        {card.title}
      </div>
      {card.description && (
        <div className="text-[11.5px] leading-[1.45] text-[var(--text-muted)] light:text-[var(--text-muted)]">
          {card.description}
        </div>
      )}

      {/* Transaction Details Meta Grid */}
      {data && (data.amount !== undefined || data.categoryName || data.walletName) && (
        <div className="flex flex-wrap gap-x-3 gap-y-2 mt-1 py-2 px-[10px] rounded-sm bg-[rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.05)] light:bg-[var(--bg-card)] light:border-[var(--border)]">
          {data.amount !== undefined && (
            <div className={META_ITEM}>
              <span className={META_LABEL}>Số tiền:</span>
              <span className={`font-bold ${isIncome ? 'text-income' : 'text-expense'}`}>
                {isIncome ? '+' : '-'}
                {new Intl.NumberFormat('vi-VN').format(Math.abs(Number(data.amount)))} đ
              </span>
            </div>
          )}
          {data.categoryName && (
            <div className={META_ITEM}>
              <span className={META_LABEL}>Danh mục:</span>
              <span className={META_TAG}>{data.categoryName}</span>
            </div>
          )}
          {data.walletName && (
            <div className={META_ITEM}>
              <span className={META_LABEL}>Ví / TK:</span>
              <span className={`meta-value ${NO_WRAP}`}>{data.walletName}</span>
            </div>
          )}
        </div>
      )}

      {/* Interactive Action Controls */}
      {feedback ? (
        <div className="inline-flex items-center gap-[6px] mt-1 py-[6px] px-[10px] rounded-sm text-[11px] font-semibold bg-[color-mix(in_srgb,var(--income)_14%,transparent)] border border-[color-mix(in_srgb,var(--income)_30%,transparent)] text-[var(--income)] light:bg-[color-mix(in_srgb,var(--income)_8%,transparent)] light:border-[color-mix(in_srgb,var(--income)_25%,transparent)] light:text-[var(--income)]">
          <CheckIcon size={14} />
          <span>{feedback}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-[6px]">
          {(card.actionType === 'TRANSACTION_PROPOSED' ||
            card.actionType === 'PENDING_CONFIRMATION') && (
            <>
              <button
                className={`${CARD_BTN} border-0 text-white bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] shadow-[0_2px_8px_color-mix(in_srgb,var(--income)_35%,transparent)] hover:-translate-y-px hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--income)_50%,transparent)]`}
                onClick={() => onConfirm(data)}
              >
                <CheckIcon size={13} />
                Xác nhận ghi chép
              </button>
              <button
                className={`${CARD_BTN} bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-[var(--text-main)] hover:bg-[rgba(255,255,255,0.14)] hover:text-white light:bg-[var(--bg-card-hover)] light:border-[var(--border-hover)] light:text-[var(--text-muted)] light:hover:bg-[var(--btn-secondary-bg)] light:hover:text-[var(--text-main)]`}
                onClick={onCancel}
              >
                Hủy
              </button>
            </>
          )}

          {card.actionType === 'TRANSACTION_CREATED' && (
            <button
              className={`${CARD_BTN} bg-[color-mix(in_srgb,var(--expense)_15%,transparent)] border border-[color-mix(in_srgb,var(--expense)_30%,transparent)] text-[var(--expense)] hover:bg-[color-mix(in_srgb,var(--expense)_28%,transparent)] hover:border-[var(--expense)] hover:text-white light:bg-[color-mix(in_srgb,var(--expense)_12%,transparent)] light:border-[var(--expense)] light:text-[var(--expense)] light:hover:bg-[color-mix(in_srgb,var(--expense)_20%,transparent)] light:hover:border-[var(--expense)] light:hover:text-[var(--expense)]`}
              onClick={() => onUndo(data)}
              title="Hoàn tác và xóa giao dịch vừa tạo"
            >
              <UndoIcon />
              Hoàn tác / Hủy
            </button>
          )}
        </div>
      )}
    </div>
  );
}
