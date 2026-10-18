import moment from 'moment';
import { TransactionType } from '../../commons/constants';
import type { ActionCard } from '../../services';
import { CheckIcon, UndoIcon } from './ChatIcons';
import type { ActionCardData } from './types';

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
    <div className={`chat-action-card ${card.actionType}`}>
      <div className="action-card-top-bar">
        <div className="action-card-badge">
          <span>{ACTION_BADGES[card.actionType] ?? '⚡ Hành động AI'}</span>
        </div>
        <span className="action-card-timestamp">{moment(createdAt).format('HH:mm')}</span>
      </div>

      <div className="action-card-title">{card.title}</div>
      {card.description && <div className="action-card-desc">{card.description}</div>}

      {/* Transaction Details Meta Grid */}
      {data && (data.amount !== undefined || data.categoryName || data.walletName) && (
        <div className="action-card-meta-grid">
          {data.amount !== undefined && (
            <div className="action-meta-item amount">
              <span className="meta-label">Số tiền:</span>
              <span className={`meta-value ${isIncome ? 'income' : 'expense'}`}>
                {isIncome ? '+' : '-'}
                {new Intl.NumberFormat('vi-VN').format(Math.abs(Number(data.amount)))} đ
              </span>
            </div>
          )}
          {data.categoryName && (
            <div className="action-meta-item">
              <span className="meta-label">Danh mục:</span>
              <span className="meta-value tag">{data.categoryName}</span>
            </div>
          )}
          {data.walletName && (
            <div className="action-meta-item">
              <span className="meta-label">Ví / TK:</span>
              <span className="meta-value tag">{data.walletName}</span>
            </div>
          )}
        </div>
      )}

      {/* Interactive Action Controls */}
      {feedback ? (
        <div className="action-card-feedback-banner">
          <CheckIcon size={14} />
          <span>{feedback}</span>
        </div>
      ) : (
        <div className="action-card-buttons-row">
          {(card.actionType === 'TRANSACTION_PROPOSED' ||
            card.actionType === 'PENDING_CONFIRMATION') && (
            <>
              <button
                className="action-card-btn action-confirm-btn"
                onClick={() => onConfirm(data)}
              >
                <CheckIcon size={13} />
                Xác nhận ghi chép
              </button>
              <button className="action-card-btn action-cancel-btn" onClick={onCancel}>
                Hủy
              </button>
            </>
          )}

          {card.actionType === 'TRANSACTION_CREATED' && (
            <button
              className="action-card-btn action-undo-btn"
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
