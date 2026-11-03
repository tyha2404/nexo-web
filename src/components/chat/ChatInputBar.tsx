import type { KeyboardEvent, RefObject } from 'react';
import { MicIcon, SendIcon } from './ChatIcons';
import { BTN_TRANSITION, NO_WRAP } from './chatStyles';
import { CORE_QUICK_CHIPS } from './toolsCatalog';

const MAX_TEXTAREA_HEIGHT = 120;

const VOICE_IDLE =
  'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)] hover:text-[var(--text-link)] light:bg-[var(--bg-card-hover)] light:border-[var(--border-hover)] light:text-[var(--text-muted)] light:hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] light:hover:border-[color-mix(in_srgb,var(--primary)_25%,transparent)] light:hover:text-[var(--primary-hover)]';
const VOICE_LISTENING =
  'bg-[color-mix(in_srgb,var(--expense)_20%,transparent)] border-[var(--expense)] text-[var(--expense)] animate-[chatVoicePulse_1.2s_infinite] light:bg-[color-mix(in_srgb,var(--expense)_12%,transparent)] light:text-[var(--expense)]';

/** Grow the textarea with its content up to a cap. */
export const autoResizeTextarea = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
};

export function ChatQuickChipsBar({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div
      className={`flex gap-[6px] py-[6px] px-3 overflow-x-auto bg-[rgba(0,0,0,0.7)] border-t border-[rgba(255,255,255,0.06)] light:bg-[var(--bg-card)] light:border-[var(--border)] ${NO_WRAP}`}
      aria-label="Gợi ý nhanh"
    >
      {CORE_QUICK_CHIPS.map((chip, idx) => (
        <button
          key={idx}
          type="button"
          className={`inline-flex items-center gap-[5px] py-[5px] px-[10px] rounded-sm cursor-pointer text-[11px] font-medium bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[var(--text-main)] ${BTN_TRANSITION} hover:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] hover:text-white hover:-translate-y-px light:bg-white light:border-[var(--border)] light:text-[var(--text-main)] light:hover:bg-[color-mix(in_srgb,var(--purple)_12%,transparent)] light:hover:border-[var(--purple)] light:hover:text-[var(--primary-hover)] ${NO_WRAP}`}
          onClick={() => onSend(chip.text)}
          title={`Gửi: "${chip.text}"`}
        >
          <span className={`text-[12px] ${NO_WRAP}`}>{chip.icon}</span>
          <span className={`text-[11px] ${NO_WRAP}`}>{chip.text}</span>
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
    <div className="flex items-end gap-2 py-3 px-[14px] bg-[var(--bg-card)] border-t border-[rgba(255,255,255,0.08)] light:bg-[var(--bg-card)] light:border-[var(--border)]">
      {voiceSupported && (
        <button
          type="button"
          className={`w-10 h-10 rounded-md border flex items-center justify-center cursor-pointer shrink-0 ${BTN_TRANSITION} ${isListening ? VOICE_LISTENING : VOICE_IDLE}`}
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
        className="chat-input-textarea flex-1 bg-[var(--bg-input)] border border-[rgba(255,255,255,0.12)] rounded-md py-[10px] px-3 text-[var(--text-main)] text-[13px] [font-family:inherit] leading-[1.4] resize-none min-h-10 max-h-[120px] outline-none overflow-y-auto transition-[border-color] duration-200 ease-[ease] focus:border-primary light:bg-white light:border-[var(--border-hover)] light:text-[var(--text-main)] light:focus:border-primary mobile:text-[16px]!"
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
        className={`w-10 h-10 rounded-md bg-[linear-gradient(135deg,var(--primary),var(--purple))] text-white border-0 flex items-center justify-center cursor-pointer shrink-0 ${BTN_TRANSITION} enabled:hover:scale-105 enabled:hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_40%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={onSend}
        disabled={!value.trim() || isLoading}
        aria-label="Send message"
      >
        <SendIcon />
      </button>
    </div>
  );
}
