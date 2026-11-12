import moment from 'moment';
import type { ActionCard } from '../../services';
import { Check, Loader2, MONEY } from '../ui';
import { cardDetails, type Detail } from './actionDetails';
import { ACTION_TYPES, effectiveStatus, isCardOfType, type PendingActionStatus } from './types';
import type { ProposalUiState } from './useChatConversation';
import { BTN_TRANSITION, NO_WRAP } from './chatStyles';

/**
 * Per action type: the left accent (it also wins over the light-theme border) and the badge
 * label. A PENDING_CONFIRMATION card shows its status badge instead (STATUS_BADGES).
 */
const ACTION_META: Record<string, { accent: string; badge?: string }> = {
  [ACTION_TYPES.TRANSACTION_CREATED]: {
    accent: 'border-l-income light:border-l-income',
    badge: '💸 Ghi chép thành công',
  },
  [ACTION_TYPES.PENDING_CONFIRMATION]: { accent: 'border-l-primary light:border-l-primary' },
  [ACTION_TYPES.DEBT_REPAID]: {
    accent: 'border-l-income light:border-l-income',
    badge: '💵 Trả/Thu nợ',
  },
  [ACTION_TYPES.CATEGORY_CREATED]: {
    accent: 'border-l-purple light:border-l-purple',
    badge: '🏷️ Danh mục',
  },
  [ACTION_TYPES.BUDGET_SET]: {
    accent: 'border-l-purple light:border-l-purple',
    badge: '🎯 Thiết lập ngân sách',
  },
  [ACTION_TYPES.TARGET_SET]: {
    accent: 'border-l-purple light:border-l-purple',
    badge: '🎯 Mục tiêu tài chính',
  },
  [ACTION_TYPES.TARGET_STATUS]: {
    accent: 'border-l-primary light:border-l-primary',
    badge: '🎯 Mục tiêu tài chính',
  },
  [ACTION_TYPES.KNOWLEDGE_SOURCE]: {
    accent: 'border-l-purple light:border-l-purple',
    badge: '📖 Tri thức tài chính',
  },
  [ACTION_TYPES.WALLET_TRANSFER]: {
    accent: 'border-l-primary light:border-l-primary',
    badge: '🔄 Chuyển tiền ví',
  },
  [ACTION_TYPES.FINANCIAL_SUMMARY]: {
    accent: 'border-l-primary light:border-l-primary',
    badge: '📊 Tổng quan tài chính',
  },
  [ACTION_TYPES.DEBT_CREATED]: {
    accent: 'border-l-warning light:border-l-warning',
    badge: '🤝 Ghi nhận vay/nợ',
  },
  [ACTION_TYPES.BUDGET_ALERT]: {
    accent: 'border-l-warning light:border-l-warning',
    badge: '⚠️ Cảnh báo ngân sách',
  },
};

const STATUS_ACCENTS: Record<PendingActionStatus, string> = {
  PENDING: ACTION_META.PENDING_CONFIRMATION.accent,
  EXECUTING: ACTION_META.PENDING_CONFIRMATION.accent,
  CONFIRMED: 'border-l-income light:border-l-income',
  CANCELLED: 'border-l-[var(--text-muted)] light:border-l-[var(--text-muted)]',
  EXPIRED: 'border-l-warning light:border-l-warning',
};

const META_ITEM = 'inline-flex items-center gap-[5px] text-[11px]';
const META_LABEL = 'text-[var(--text-muted)] font-medium light:text-[var(--text-muted)]';
// The old markup also carried the global `.tag` class (no-wrap), hence NO_WRAP.
const META_TAG = `font-semibold text-primary bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] py-px px-[6px] rounded-xs text-[10.5px] ${NO_WRAP}`;
// 44px tall: these are tapped on a phone.
const CARD_BTN = `inline-flex min-h-[44px] items-center justify-center gap-[6px] py-2 px-4 rounded-sm text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${BTN_TRANSITION}`;
const NOTE = 'mt-1 py-[6px] px-[10px] rounded-sm text-[11.5px] font-semibold border';

const STATUS_BADGES: Record<PendingActionStatus, string> = {
  PENDING: '⏳ Chờ xác nhận',
  EXECUTING: '⏳ Đang thực hiện',
  CONFIRMED: '✅ Đã xác nhận',
  CANCELLED: '🚫 Đã hủy',
  EXPIRED: '⌛ Đã hết hạn',
};

const TONE_CLASS: Record<NonNullable<Detail['tone']>, string> = {
  income: 'text-income',
  expense: 'text-expense',
  neutral: 'text-[var(--text-main)] light:text-[var(--text-main)]',
};

function DetailsGrid({ details }: { details: Detail[] }) {
  if (details.length === 0) return null;
  return (
    <dl className="m-0 flex flex-wrap gap-x-3 gap-y-2 mt-1 py-2 px-[10px] rounded-sm bg-[rgba(0,0,0,0.25)] border border-line light:bg-[var(--bg-card)]">
      {details.map((detail) => (
        <div key={detail.label} className={META_ITEM}>
          <dt className={META_LABEL}>{detail.label}:</dt>
          <dd
            className={`m-0 ${
              detail.tag
                ? META_TAG
                : detail.tone
                  ? `${MONEY} ${TONE_CLASS[detail.tone]}`
                  : `meta-value ${NO_WRAP}`
            }`}
          >
            {detail.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The outcome line of a proposal that is no longer pending. */
const STATUS_NOTES: Partial<Record<PendingActionStatus, { text: string; className: string }>> = {
  CONFIRMED: {
    text: 'Đã xác nhận và lưu.',
    className:
      'bg-[color-mix(in_srgb,var(--income)_14%,transparent)] border-[color-mix(in_srgb,var(--income)_30%,transparent)] text-[var(--income)] light:text-[var(--income)]',
  },
  CANCELLED: {
    text: 'Đã hủy, không có dữ liệu nào được lưu.',
    className: 'border-line text-[var(--text-muted)] light:text-[var(--text-muted)]',
  },
  EXPIRED: {
    text: 'Đề xuất đã hết hạn, không có dữ liệu nào được lưu. Hãy nhắn lại trợ lý AI để tạo đề xuất mới.',
    className:
      'bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)] text-[var(--warning)] light:text-[var(--warning)]',
  },
  EXECUTING: {
    text: 'Đang thực hiện...',
    className: 'border-line text-[var(--text-muted)] light:text-[var(--text-muted)]',
  },
};

const ERROR_NOTE =
  'bg-[color-mix(in_srgb,var(--expense)_12%,transparent)] border-[color-mix(in_srgb,var(--expense)_30%,transparent)] text-[var(--expense)] light:text-[var(--expense)]';

export interface ActionCardViewProps {
  card: ActionCard;
  createdAt?: string;
  /** Client state of a PENDING_CONFIRMATION card (busy / last error). */
  ui?: ProposalUiState;
  onConfirm: (card: ActionCard) => void;
  onCancel: (card: ActionCard) => void;
}

/** Card attached to an AI reply: a write proposal to confirm, or a read-only result. */
export function ActionCardView({ card, createdAt, ui, onConfirm, onCancel }: ActionCardViewProps) {
  const proposal = isCardOfType(card, ACTION_TYPES.PENDING_CONFIRMATION) ? card.data : null;
  const status = proposal ? effectiveStatus(proposal) : null;
  // After a confirm, the executed card says what was saved (e.g. "Đã ghi nhận Chi tiêu").
  const shown = (status === 'CONFIRMED' && proposal?.resultCard) || card;
  const note = status ? STATUS_NOTES[status] : undefined;
  const canAct = status === 'PENDING' && !ui?.handled;
  const busy = ui?.busy;

  return (
    <div
      data-testid="chat-action-card"
      className={`mt-[10px] py-3 px-[14px] rounded-md flex flex-col gap-[6px] bg-[rgba(0,0,0,0.7)] border border-line border-l-[3.5px] shadow-[0_4px_16px_rgba(0,0,0,0.25)] light:bg-white light:shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${(status && STATUS_ACCENTS[status]) ?? ACTION_META[card.actionType]?.accent ?? 'border-l-[var(--income)]'}`}
    >
      <div className="flex items-center justify-between gap-2 mb-[2px]">
        <div
          className={`text-[11px] font-bold text-[var(--text-main)] light:text-[var(--text-main)] ${NO_WRAP}`}
        >
          <span>
            {status
              ? STATUS_BADGES[status]
              : (ACTION_META[card.actionType]?.badge ?? '⚡ Hành động AI')}
          </span>
        </div>
        {createdAt && (
          <span className="text-[10px] text-muted">{moment(createdAt).format('HH:mm')}</span>
        )}
      </div>

      <div className="text-[12px] font-semibold text-[var(--text-main)] light:text-[var(--text-main)]">
        {shown.title}
      </div>
      {shown.description && (
        <div className="text-[11.5px] leading-[1.45] text-[var(--text-muted)] light:text-[var(--text-muted)]">
          {shown.description}
        </div>
      )}

      <DetailsGrid details={cardDetails(card)} />

      {note && (
        <div className={`${NOTE} inline-flex items-center gap-[6px] ${note.className}`}>
          {status === 'CONFIRMED' && <Check size={16} />}
          <span>{note.text}</span>
        </div>
      )}
      {ui?.handled && (
        <div className={`${NOTE} border-line text-[var(--text-muted)]`}>
          Đề xuất này đã được xử lý trước đó (có thể từ thiết bị khác).
        </div>
      )}
      {ui?.error && (
        <div role="alert" className={`${NOTE} ${ERROR_NOTE}`}>
          {ui.error}
        </div>
      )}

      {canAct && (
        <div className="flex flex-wrap items-center gap-2 mt-[6px]">
          <button
            type="button"
            className={`${CARD_BTN} border-0 text-white bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] shadow-[0_2px_8px_color-mix(in_srgb,var(--income)_35%,transparent)] enabled:hover:-translate-y-px enabled:hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--income)_50%,transparent)]`}
            onClick={() => onConfirm(card)}
            disabled={!!busy}
            aria-busy={busy === 'confirm'}
          >
            {busy === 'confirm' ? <Loader2 className="animate-spin" /> : <Check size={14} />}
            {busy === 'confirm' ? 'Đang lưu...' : 'Xác nhận'}
          </button>
          <button
            type="button"
            className={`${CARD_BTN} bg-[rgba(255,255,255,0.08)] border border-line text-[var(--text-main)] enabled:hover:bg-[rgba(255,255,255,0.14)] enabled:hover:text-white light:bg-[var(--bg-card-hover)] light:border-[var(--border-hover)] light:text-[var(--text-muted)] light:enabled:hover:bg-[var(--btn-secondary-bg)] light:enabled:hover:text-[var(--text-main)]`}
            onClick={() => onCancel(card)}
            disabled={!!busy}
            aria-busy={busy === 'cancel'}
          >
            {busy === 'cancel' ? 'Đang hủy...' : 'Hủy'}
          </button>
        </div>
      )}
    </div>
  );
}
