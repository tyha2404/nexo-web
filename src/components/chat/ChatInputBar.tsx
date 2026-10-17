import type { KeyboardEvent, RefObject } from 'react';
import { MicIcon, SendIcon } from './ChatIcons';
import { CORE_QUICK_CHIPS } from './toolsCatalog';

const MAX_TEXTAREA_HEIGHT = 120;

/** Grow the textarea with its content up to a cap. */
export const autoResizeTextarea = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
};

export function ChatQuickChipsBar({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div className="chat-quick-chips-bar" aria-label="Gợi ý nhanh">
      {CORE_QUICK_CHIPS.map((chip, idx) => (
        <button
          key={idx}
          type="button"
          className="chat-quick-chip-item"
          onClick={() => onSend(chip.text)}
          title={`Gửi: "${chip.text}"`}
        >
          <span className="chip-icon">{chip.icon}</span>
          <span className="chip-text">{chip.text}</span>
        </button>
      ))}
    </div>
  );
}

export interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  voiceSupported: boolean;
  isListening: boolean;
  onToggleVoice: () => void;
}

export function ChatInputBar({
  value,
  onChange,
  onSend,
  isLoading,
  textareaRef,
  voiceSupported,
  isListening,
  onToggleVoice,
}: ChatInputBarProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="chat-input-container">
      {voiceSupported && (
        <button
          type="button"
          className={`chat-voice-btn ${isListening ? 'listening' : ''}`}
          onClick={onToggleVoice}
          title={
            isListening ? 'Đang lắng nghe... Nhấn để dừng' : 'Nhập bằng giọng nói (Tiếng Việt)'
          }
          aria-label="Voice input"
        >
          <MicIcon />
        </button>
      )}
      <textarea
        ref={textareaRef}
        className="chat-input-textarea"
        placeholder={
          isListening
            ? '🎙️ Đang nghe giọng nói của bạn...'
            : 'Nhập yêu cầu (ví dụ: Chi 45k cafe, Số dư các ví, Ngân sách...)'
        }
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          autoResizeTextarea(e.target);
        }}
        onKeyDown={handleKeyDown}
        rows={1}
      />
      <button
        className="chat-send-btn"
        onClick={onSend}
        disabled={!value.trim() || isLoading}
        aria-label="Send message"
      >
        <SendIcon />
      </button>
    </div>
  );
}
