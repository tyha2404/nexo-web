import moment from 'moment';
import type { RefObject } from 'react';
import type { ActionCard, ChatMessage } from '../../services';
import { ActionCardView } from './ActionCardView';
import { Clock, Loader2 } from '../ui';
import { RetryIcon } from './ChatIcons';
import { renderFormattedText } from './markdown';
import { CORE_QUICK_CHIPS, type QuickPrompt } from './toolsCatalog';
import type { ProposalUiState } from './useChatConversation';
import { BTN_TRANSITION, NO_WRAP } from './chatStyles';

const CHIP_CARD = `flex flex-col gap-1 py-[10px] px-3 rounded-md text-left cursor-pointer bg-[rgba(255,255,255,0.04)] border border-line transition-all! duration-[220ms]! ease-[cubic-bezier(0.16,1,0.3,1)]! hover:bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] hover:-translate-y-[2px] hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)] light:bg-[var(--bg-card)] light:hover:bg-[color-mix(in_srgb,var(--purple)_8%,transparent)] light:hover:border-[var(--purple)] light:hover:shadow-[0_6px_16px_color-mix(in_srgb,var(--primary)_10%,transparent)] ${NO_WRAP}`;
const PROMPT_BTN = `flex items-center gap-2 py-[9px] px-3 rounded-md text-left cursor-pointer text-[11.5px] bg-[rgba(255,255,255,0.04)] border border-line text-[var(--text-main)] ${BTN_TRANSITION} hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_30%,transparent)] hover:text-[var(--text-main)] hover:translate-x-[3px] light:bg-[var(--bg-card-hover)] light:text-[var(--text-main)] light:hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] light:hover:border-[color-mix(in_srgb,var(--primary)_25%,transparent)] light:hover:text-[var(--primary)]`;
const CHIPS_TITLE = `text-[11px] font-bold uppercase tracking-[0.5px] text-muted text-left pl-[2px] ${NO_WRAP}`;
const TYPING_DOT =
  'w-[7px] h-[7px] rounded-full inline-block bg-[linear-gradient(135deg,var(--primary),var(--purple))] animate-[chatTypingBounce_1.4s_infinite_ease-in-out_both]';

const bubbleClass = (
  role: ChatMessage['role'],
  thinking: boolean,
  streaming: boolean,
  error: boolean
) => {
  const cls = [
    'rounded-lg text-[13px] leading-[1.55] [word-break:break-word] transition-all duration-200 ease-[ease]',
    thinking ? 'py-3 px-[18px] inline-flex items-center justify-center' : 'py-[10px] px-[14px]',
  ];
  if (role === 'user')
    cls.push(
      'bg-[linear-gradient(135deg,var(--primary),var(--primary))] text-white rounded-br-[4px] shadow-[0_2px_8px_color-mix(in_srgb,var(--primary)_30%,transparent)]'
    );
  if (role === 'model') {
    cls.push(
      'bg-[var(--bg-input)] text-[var(--text-main)] border rounded-bl-[4px] light:bg-[var(--bg-card-hover)] light:text-[var(--text-main)]'
    );
    // The streaming highlight outranked the light-theme border in the old CSS.
    cls.push(
      streaming
        ? 'border-[color-mix(in_srgb,var(--primary)_35%,transparent)] shadow-[0_4px_16px_color-mix(in_srgb,var(--primary)_15%,transparent)]'
        : 'border-line shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
    );
  }
  if (error)
    cls.push(
      'border-[color-mix(in_srgb,var(--expense)_45%,transparent)]! [background:color-mix(in_srgb,var(--expense)_8%,transparent)]!'
    );
  return cls.join(' ');
};

export interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  activeToolTitle: string | null;
  userInitial: string;
  quickPrompts: QuickPrompt[];
  /** Client state of write proposals, by actionId. */
  proposalUi: Record<string, ProposalUiState>;
  endRef: RefObject<HTMLDivElement | null>;
  onSend: (text: string) => void;
  onRetry: (messageIndex: number) => void;
  onConfirmAction: (card: ActionCard) => void;
  onCancelAction: (card: ActionCard) => void;
}

function ChatEmptyState({
  quickPrompts,
  onSend,
}: Pick<ChatMessageListProps, 'quickPrompts' | 'onSend'>) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-5 px-2 text-muted h-full">
      <div className="w-[52px] h-[52px] rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary flex items-center justify-center mb-3 shadow-[0_4px_16px_color-mix(in_srgb,var(--primary)_25%,transparent)]">
        <Clock />
      </div>
      <h4 className="m-0 mb-[6px] text-[16px] font-bold text-[var(--text-main)] light:text-[var(--text-main)]">
        Xin chào! Tôi là Nexo AI Copilot
      </h4>
      <p className="m-0 mb-4 text-[12px] leading-[1.5] text-[var(--text-muted)] max-w-[360px] light:text-[var(--text-muted)]">
        Tôi có thể giúp bạn tự động ghi nhận thu chi, tra cứu số dư ví, đối soát ngân sách và phân
        tích chi tiêu ngay tức thì.
      </p>

      {/* Primary 1-Tap Quick Prompt Chips */}
      <div className={`mb-4 w-full flex flex-col gap-2 ${NO_WRAP}`}>
        <span className={CHIPS_TITLE}>⚡ Gợi ý thử nghiệm nhanh</span>
        <div className={`grid grid-cols-[1fr_1fr] gap-2 w-full mobile:grid-cols-[1fr]! ${NO_WRAP}`}>
          {CORE_QUICK_CHIPS.map((chip, idx) => (
            <button key={idx} className={CHIP_CARD} onClick={() => onSend(chip.text)}>
              <div className={`flex items-center justify-between ${NO_WRAP}`}>
                <span className={`text-[16px] ${NO_WRAP}`}>{chip.icon}</span>
                <span
                  className={`text-[9.5px] font-semibold py-px px-[6px] rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--text-link)] light:bg-[color-mix(in_srgb,var(--purple)_12%,transparent)] light:text-[var(--purple)] ${NO_WRAP}`}
                >
                  {chip.category}
                </span>
              </div>
              <span
                className={`text-[11.5px] font-semibold leading-[1.35] text-[var(--text-main)] light:text-[var(--text-main)] ${NO_WRAP}`}
              >
                {chip.text}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Contextual Prompts */}
      <div className="flex flex-col gap-2 w-full">
        <span className={CHIPS_TITLE}>💡 Gợi ý theo thời gian</span>
        {quickPrompts.map((prompt, idx) => (
          <button key={idx} className={PROMPT_BTN} onClick={() => onSend(prompt.text)}>
            <span>{prompt.icon}</span>
            <span>{prompt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Scrollable conversation: empty state, message bubbles, action cards and tool status. */
export function ChatMessageList({
  messages,
  isLoading,
  activeToolTitle,
  userInitial,
  quickPrompts,
  proposalUi,
  endRef,
  onSend,
  onRetry,
  onConfirmAction,
  onCancelAction,
}: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-[14px] scroll-smooth mobile:p-3 mobile:gap-3">
      {messages.length === 0 ? (
        <ChatEmptyState quickPrompts={quickPrompts} onSend={onSend} />
      ) : (
        messages.map((msg, idx) => {
          const isCurrentTurnLoading = isLoading && idx === messages.length - 1;
          const isThinking = msg.role === 'model' && !msg.content;
          return (
            <div
              key={idx}
              className={`flex gap-[10px] max-w-[90%] mobile:max-w-[95%] animate-[chatMessageFadeIn_0.28s_cubic-bezier(0.16,1,0.3,1)_forwards] ${msg.role === 'user' ? 'self-end flex-row-reverse' : msg.role === 'model' ? 'self-start' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-sm flex items-center justify-center shrink-0 text-[12px] font-bold text-white ${msg.role === 'user' ? 'bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] shadow-[0_2px_8px_color-mix(in_srgb,var(--primary)_30%,transparent)]' : 'bg-[linear-gradient(135deg,var(--primary),var(--purple))]'}`}
              >
                {msg.role === 'user' ? userInitial : 'AI'}
              </div>
              <div
                className={bubbleClass(
                  msg.role,
                  isThinking,
                  isCurrentTurnLoading,
                  msg.status === 'ERROR'
                )}
              >
                {isThinking ? (
                  isCurrentTurnLoading ? (
                    <div className="flex items-center gap-[5px] h-[14px]">
                      <span className={TYPING_DOT} style={{ animationDelay: '-0.32s' }}></span>
                      <span className={TYPING_DOT} style={{ animationDelay: '-0.16s' }}></span>
                      <span className={TYPING_DOT} style={{ animationDelay: '0s' }}></span>
                    </div>
                  ) : (
                    <p className="m-0! text-expense!">⚠️ Không nhận được phản hồi từ máy chủ.</p>
                  )
                ) : (
                  <>
                    {renderFormattedText(msg.content)}
                    {isCurrentTurnLoading && (
                      <span className="inline-block w-[7px] h-[14px] ml-1 align-text-bottom rounded-xs bg-[linear-gradient(180deg,#6366f1_0%,#818cf8_100%)] shadow-[0_0_8px_color-mix(in_srgb,var(--primary)_80%,transparent)] animate-[chatCursorPulse_0.8s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                    )}
                  </>
                )}

                {msg.actionCards?.map((card, cardIdx) => {
                  const actionId = (card.data as { actionId?: unknown } | undefined)?.actionId;
                  return (
                    <ActionCardView
                      key={typeof actionId === 'string' ? actionId : cardIdx}
                      card={card}
                      createdAt={msg.createdAt}
                      ui={typeof actionId === 'string' ? proposalUi[actionId] : undefined}
                      onConfirm={onConfirmAction}
                      onCancel={onCancelAction}
                    />
                  );
                })}

                {/* Retry button for error state */}
                {msg.role === 'model' && msg.status === 'ERROR' && !isLoading && (
                  <div>
                    <button
                      className={`inline-flex items-center gap-[6px] mt-2 py-[5px] px-3 rounded-sm cursor-pointer text-[11px] font-semibold bg-[color-mix(in_srgb,var(--expense)_15%,transparent)] border border-[color-mix(in_srgb,var(--expense)_35%,transparent)] text-expense ${BTN_TRANSITION} hover:bg-[color-mix(in_srgb,var(--expense)_28%,transparent)] hover:border-expense hover:text-white hover:-translate-y-px [&_svg]:[transition:transform_0.3s_ease]! hover:[&_svg]:[transform:rotate(180deg)]`}
                      onClick={() => onRetry(idx)}
                    >
                      <RetryIcon />
                      Thử lại
                    </button>
                  </div>
                )}

                {/* Only display timestamp when message has content / finished loading */}
                {!isThinking && msg.createdAt && (
                  <span>{moment(msg.createdAt).format('HH:mm')}</span>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Active Tool Execution Indicator */}
      {activeToolTitle && (
        <div
          className={`flex items-center gap-2 py-[6px] px-[10px] mb-2 rounded-sm text-[11px] text-primary bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] animate-[chatPulse_1.5s_infinite] ${NO_WRAP}`}
        >
          <Loader2 className="animate-spin" />
          <span>{activeToolTitle}</span>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
