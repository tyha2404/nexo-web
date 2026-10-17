import moment from 'moment';
import type { RefObject } from 'react';
import type { ChatMessage } from '../../services';
import { ActionCardView } from './ActionCardView';
import { ClockIcon, RetryIcon, SpinnerIcon } from './ChatIcons';
import { renderFormattedText } from './markdown';
import { CORE_QUICK_CHIPS, type QuickPrompt } from './toolsCatalog';
import type { ActionCardData } from './types';

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
    <div className="chat-empty-state">
      <div className="empty-icon">
        <ClockIcon />
      </div>
      <h4>Xin chào! Tôi là Nexo AI Copilot</h4>
      <p>
        Tôi có thể giúp bạn tự động ghi nhận thu chi, tra cứu số dư ví, đối soát ngân sách và phân
        tích chi tiêu ngay tức thì.
      </p>

      {/* Primary 1-Tap Quick Prompt Chips */}
      <div className="core-quick-chips-section">
        <span className="quick-chips-title">⚡ Gợi ý thử nghiệm nhanh</span>
        <div className="core-quick-chips-grid">
          {CORE_QUICK_CHIPS.map((chip, idx) => (
            <button key={idx} className="core-quick-chip-card" onClick={() => onSend(chip.text)}>
              <div className="chip-card-top">
                <span className="chip-card-icon">{chip.icon}</span>
                <span className="chip-card-badge">{chip.category}</span>
              </div>
              <span className="chip-card-text">{chip.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contextual Prompts */}
      <div className="quick-prompts-grid">
        <span className="quick-chips-title">💡 Gợi ý theo thời gian</span>
        {quickPrompts.map((prompt, idx) => (
          <button key={idx} className="quick-prompt-btn" onClick={() => onSend(prompt.text)}>
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
    <div className="chat-messages-container">
      {messages.length === 0 ? (
        <ChatEmptyState quickPrompts={quickPrompts} onSend={onSend} />
      ) : (
        messages.map((msg, idx) => {
          const isCurrentTurnLoading = isLoading && idx === messages.length - 1;
          const isThinking = msg.role === 'model' && !msg.content;
          return (
            <div key={idx} className={`chat-message-row ${msg.role}`}>
              <div
                className={`message-avatar ${msg.role === 'user' ? 'user-avatar' : 'model-avatar'}`}
              >
                {msg.role === 'user' ? userInitial : 'AI'}
              </div>
              <div
                className={`message-bubble ${isThinking ? 'thinking-bubble' : ''} ${isCurrentTurnLoading && msg.role === 'model' ? 'is-streaming' : ''} ${msg.status === 'ERROR' ? 'status-error' : ''}`}
              >
                {isThinking ? (
                  isCurrentTurnLoading ? (
                    <div className="typing-dots">
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <span className="dot"></span>
                    </div>
                  ) : (
                    <p className="m-0! text-expense!">⚠️ Không nhận được phản hồi từ máy chủ.</p>
                  )
                ) : (
                  <>
                    {renderFormattedText(msg.content)}
                    {isCurrentTurnLoading && <span className="streaming-cursor" />}
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
                    <button className="chat-retry-btn" onClick={() => onRetry(idx)}>
                      <RetryIcon />
                      Thử lại
                    </button>
                  </div>
                )}

                {/* Only display timestamp when message has content / finished loading */}
                {!isThinking && msg.createdAt && (
                  <span className="message-time">{moment(msg.createdAt).format('HH:mm')}</span>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Active Tool Execution Indicator */}
      {activeToolTitle && (
        <div className="tool-status-badge">
          <SpinnerIcon />
          <span>{activeToolTitle}</span>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
