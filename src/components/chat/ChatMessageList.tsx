import moment from 'moment';
import type { RefObject } from 'react';
import type { ChatMessage } from '../../services';
import { ActionCardView } from './ActionCardView';
import { ClockIcon, RetryIcon, SpinnerIcon } from './ChatIcons';
import { renderFormattedText } from './markdown';
import { CORE_QUICK_CHIPS, type QuickPrompt } from './toolsCatalog';
import type { ActionCardData } from './types';
import { BTN_TRANSITION, NO_WRAP } from './chatStyles';

const CHIP_CARD = `flex flex-col gap-1 py-[10px] px-3 rounded-md text-left cursor-pointer bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] transition-all! duration-[220ms]! ease-[cubic-bezier(0.16,1,0.3,1)]! hover:bg-[rgba(99,102,241,0.14)] hover:border-[rgba(99,102,241,0.4)] hover:-translate-y-[2px] hover:shadow-[0_6px_16px_rgba(0,0,0,0.25)] light:bg-[#f8fafc] light:border-[#e2e8f0] light:hover:bg-[#f5f3ff] light:hover:border-[#c4b5fd] light:hover:shadow-[0_6px_16px_rgba(99,102,241,0.1)] ${NO_WRAP}`;
const PROMPT_BTN = `flex items-center gap-2 py-[9px] px-3 rounded-md text-left cursor-pointer text-[11.5px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#cbd5e1] ${BTN_TRANSITION} hover:bg-[rgba(99,102,241,0.12)] hover:border-[rgba(99,102,241,0.3)] hover:text-[#f8fafc] hover:translate-x-[3px] light:bg-[#f1f5f9] light:border-[#e2e8f0] light:text-[#334155] light:hover:bg-[#e0e7ff] light:hover:border-[#818cf8] light:hover:text-[#1e1b4b]`;
const CHIPS_TITLE = `text-[11px] font-bold uppercase tracking-[0.5px] text-muted text-left pl-[2px] ${NO_WRAP}`;
const TYPING_DOT =
  'w-[7px] h-[7px] rounded-full inline-block bg-[linear-gradient(135deg,#6366f1,#a855f7)] animate-[chatTypingBounce_1.4s_infinite_ease-in-out_both]';

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
      'bg-[linear-gradient(135deg,#4f46e5,#6366f1)] text-white rounded-br-[4px] shadow-[0_2px_8px_rgba(79,70,229,0.3)]'
    );
  if (role === 'model') {
    cls.push(
      'bg-[#273549] text-[#e2e8f0] border rounded-bl-[4px] light:bg-[#f1f5f9] light:text-[#1e293b]'
    );
    // The streaming highlight outranked the light-theme border in the old CSS.
    cls.push(
      streaming
        ? 'border-[rgba(99,102,241,0.35)] shadow-[0_4px_16px_rgba(99,102,241,0.15)]'
        : 'border-[rgba(255,255,255,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.2)] light:border-[#e2e8f0]'
    );
  }
  if (error) cls.push('border-[rgba(239,68,68,0.45)]! [background:rgba(239,68,68,0.08)]!');
  return cls.join(' ');
};

export interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  activeToolTitle: string | null;
  userInitial: string;
  quickPrompts: QuickPrompt[];
  actionFeedback: Record<number, string>;
  endRef: RefObject<HTMLDivElement | null>;
  onSend: (text: string) => void;
  onRetry: (messageIndex: number) => void;
  onConfirmAction: (data: ActionCardData | undefined, messageIndex: number) => void;
  onCancelAction: (messageIndex: number) => void;
  onUndoAction: (data: ActionCardData | undefined, messageIndex: number) => void;
}

function ChatEmptyState({
  quickPrompts,
  onSend,
}: Pick<ChatMessageListProps, 'quickPrompts' | 'onSend'>) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-5 px-2 text-muted h-full">
      <div className="w-[52px] h-[52px] rounded-full bg-[rgba(99,102,241,0.15)] text-primary flex items-center justify-center mb-3 shadow-[0_4px_16px_rgba(99,102,241,0.25)]">
        <ClockIcon />
      </div>
      <h4 className="m-0 mb-[6px] text-[16px] font-bold text-[#f8fafc] light:text-[#0f172a]">
        Xin chào! Tôi là Nexo AI Copilot
      </h4>
      <p className="m-0 mb-4 text-[12px] leading-[1.5] text-[#94a3b8] max-w-[360px] light:text-[#64748b]">
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
                  className={`text-[9.5px] font-semibold py-px px-[6px] rounded-full bg-[rgba(99,102,241,0.18)] text-[#c7d2fe] light:bg-[#ede9fe] light:text-[#5b21b6] ${NO_WRAP}`}
                >
                  {chip.category}
                </span>
              </div>
              <span
                className={`text-[11.5px] font-semibold leading-[1.35] text-[#f1f5f9] light:text-[#0f172a] ${NO_WRAP}`}
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
  actionFeedback,
  endRef,
  onSend,
  onRetry,
  onConfirmAction,
  onCancelAction,
  onUndoAction,
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
                className={`w-7 h-7 rounded-sm flex items-center justify-center shrink-0 text-[12px] font-bold text-white ${msg.role === 'user' ? 'bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] shadow-[0_2px_8px_rgba(99,102,241,0.3)]' : 'bg-[linear-gradient(135deg,#6366f1,#a855f7)]'}`}
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
                      <span className="inline-block w-[7px] h-[14px] ml-1 align-text-bottom rounded-xs bg-[linear-gradient(180deg,#6366f1_0%,#818cf8_100%)] shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-[chatCursorPulse_0.8s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                    )}
                  </>
                )}

                {msg.actionCard && (
                  <ActionCardView
                    card={msg.actionCard}
                    createdAt={msg.createdAt}
                    feedback={actionFeedback[idx]}
                    onConfirm={(data) => onConfirmAction(data, idx)}
                    onCancel={() => onCancelAction(idx)}
                    onUndo={(data) => onUndoAction(data, idx)}
                  />
                )}

                {/* Retry button for error state */}
                {msg.role === 'model' && msg.status === 'ERROR' && !isLoading && (
                  <div>
                    <button
                      className={`inline-flex items-center gap-[6px] mt-2 py-[5px] px-3 rounded-sm cursor-pointer text-[11px] font-semibold bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.35)] text-expense ${BTN_TRANSITION} hover:bg-[rgba(239,68,68,0.28)] hover:border-expense hover:text-white hover:-translate-y-px [&_svg]:[transition:transform_0.3s_ease]! hover:[&_svg]:[transform:rotate(180deg)]`}
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
          className={`flex items-center gap-2 py-[6px] px-[10px] mb-2 rounded-sm text-[11px] text-primary bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.25)] animate-[chatPulse_1.5s_infinite] ${NO_WRAP}`}
        >
          <SpinnerIcon />
          <span>{activeToolTitle}</span>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
