import type { KeyboardEvent, RefObject } from 'react';
import { MicIcon, SendIcon } from './ChatIcons';
import { BTN_TRANSITION, NO_WRAP } from './chatStyles';
import { CORE_QUICK_CHIPS } from './toolsCatalog';

const MAX_TEXTAREA_HEIGHT = 120;

const VOICE_IDLE =
  'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-[#94a3b8] hover:bg-[rgba(99,102,241,0.15)] hover:border-[rgba(99,102,241,0.35)] hover:text-[#818cf8] light:bg-[#f1f5f9] light:border-[#cbd5e1] light:text-[#475569] light:hover:bg-[#e0e7ff] light:hover:border-[#818cf8] light:hover:text-[#4338ca]';
const VOICE_LISTENING =
  'bg-[rgba(239,68,68,0.2)] border-[#ef4444] text-[#ef4444] animate-[chatVoicePulse_1.2s_infinite] light:bg-[#fee2e2] light:text-[#dc2626]';

/** Grow the textarea with its content up to a cap. */
export const autoResizeTextarea = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
};

export function ChatQuickChipsBar({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div
      className={`flex gap-[6px] py-[6px] px-3 overflow-x-auto bg-[rgba(15,23,42,0.7)] border-t border-[rgba(255,255,255,0.06)] light:bg-[#f8fafc] light:border-[#e2e8f0] ${NO_WRAP}`}
      aria-label="Gợi ý nhanh"
    >
      {CORE_QUICK_CHIPS.map((chip, idx) => (
        <button
          key={idx}
          type="button"
          className={`inline-flex items-center gap-[5px] py-[5px] px-[10px] rounded-sm cursor-pointer text-[11px] font-medium bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#cbd5e1] ${BTN_TRANSITION} hover:bg-[rgba(99,102,241,0.18)] hover:border-[rgba(99,102,241,0.4)] hover:text-white hover:-translate-y-px light:bg-white light:border-[#e2e8f0] light:text-[#334155] light:hover:bg-[#ede9fe] light:hover:border-[#c4b5fd] light:hover:text-[#4338ca] ${NO_WRAP}`}
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
    <div className="flex items-end gap-2 py-3 px-[14px] bg-[#111827] border-t border-[rgba(255,255,255,0.08)] light:bg-[#f8fafc] light:border-[#e2e8f0]">
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
        className="chat-input-textarea flex-1 bg-[#1e293b] border border-[rgba(255,255,255,0.12)] rounded-md py-[10px] px-3 text-[#f8fafc] text-[13px] [font-family:inherit] leading-[1.4] resize-none min-h-10 max-h-[120px] outline-none overflow-y-auto transition-[border-color] duration-200 ease-[ease] focus:border-primary light:bg-white light:border-[#cbd5e1] light:text-[#0f172a] light:focus:border-primary mobile:text-[16px]!"
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
        className={`w-10 h-10 rounded-md bg-[linear-gradient(135deg,#6366f1,#a855f7)] text-white border-0 flex items-center justify-center cursor-pointer shrink-0 ${BTN_TRANSITION} enabled:hover:scale-105 enabled:hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={onSend}
        disabled={!value.trim() || isLoading}
        aria-label="Send message"
      >
        <SendIcon />
      </button>
    </div>
  );
}
