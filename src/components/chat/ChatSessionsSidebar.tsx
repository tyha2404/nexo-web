import type { MouseEvent } from 'react';
import type { ChatSession } from '../../services';
import { ChatBubbleIcon, CloseIcon, ListIcon, PlusIcon } from './ChatIcons';
import {
  BTN_TRANSITION,
  SIDEBAR_CLOSE_BTN,
  SIDEBAR_HEADER,
  SIDEBAR_PANEL,
  SIDEBAR_TITLE,
} from './chatStyles';

const ROW =
  'group flex items-center justify-between py-2 px-[10px] rounded-sm cursor-pointer border text-[12px] transition-all duration-200 ease-[ease]';
const ROW_IDLE =
  'bg-[rgba(255,255,255,0.03)] border-line text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_30%,transparent)] hover:text-[var(--text-main)] light:bg-white light:text-[var(--text-muted)] light:hover:bg-[var(--bg-card-hover)] light:hover:border-[var(--border-hover)] light:hover:text-[var(--text-main)]';
const ROW_SELECTED =
  '[background:linear-gradient(90deg,color-mix(in_srgb,var(--primary)_22%,transparent)_0%,color-mix(in_srgb,var(--purple)_12%,transparent)_100%)] border-[color-mix(in_srgb,var(--primary)_50%,transparent)] text-[var(--text-link)] font-semibold light:[background:color-mix(in_srgb,var(--purple)_12%,transparent)] light:border-[var(--purple)] light:text-[var(--primary)]';

export interface ChatSessionsSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onClose: () => void;
  onNewChat: () => void;
  onClearAll: () => void;
  onSelect: (sessionId: string) => void;
  onDelete: (e: MouseEvent, sessionId: string) => void;
}

/** Chat history list shown as a right sidebar / sheet. */
export function ChatSessionsSidebar({
  sessions,
  currentSessionId,
  onClose,
  onNewChat,
  onClearAll,
  onSelect,
  onDelete,
}: ChatSessionsSidebarProps) {
  return (
    <div className={`${SIDEBAR_PANEL} w-[270px] max-w-[85%]`}>
      <div className={SIDEBAR_HEADER}>
        <div className={SIDEBAR_TITLE}>
          <ListIcon size={16} />
          <span>Lịch sử chat</span>
        </div>
        <button className={SIDEBAR_CLOSE_BTN} onClick={onClose} title="Đóng danh sách lịch sử">
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 px-[14px] py-[10px]">
        <button
          className={`inline-flex items-center gap-[6px] py-[5px] px-[9px] rounded-sm cursor-pointer text-[11.5px] font-semibold bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] text-[var(--text-link)] ${BTN_TRANSITION} hover:bg-[color-mix(in_srgb,var(--primary)_25%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_50%,transparent)] hover:text-white light:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] light:border-[color-mix(in_srgb,var(--primary)_25%,transparent)] light:text-[var(--primary)] light:hover:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] light:hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] light:hover:text-[var(--primary)]`}
          onClick={onNewChat}
        >
          <PlusIcon size={13} />
          <span>Đoạn chat mới</span>
        </button>
        {sessions.length > 0 && (
          <button
            className={`bg-transparent border-0 text-expense text-[11px] font-semibold cursor-pointer py-1 px-[6px] rounded-xs ${BTN_TRANSITION} hover:bg-[color-mix(in_srgb,var(--expense)_15%,transparent)]`}
            onClick={onClearAll}
            title="Xóa tất cả lịch sử"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="py-6 px-[14px] text-center text-muted text-[12px]">
          <p>Chưa có lịch sử trò chuyện.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-2 px-[10px] flex flex-col gap-[5px]">
          {sessions.map((sess) => {
            const isSelected = sess.id === currentSessionId;
            return (
              <div
                key={sess.id}
                className={`${ROW} ${isSelected ? ROW_SELECTED : ROW_IDLE}`}
                onClick={() => onSelect(sess.id)}
              >
                <div className="flex items-center gap-[9px] overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                  <ChatBubbleIcon className={isSelected ? 'text-link' : 'text-muted'} />
                  <span title={sess.title}>{sess.title}</span>
                </div>
                <div className="flex items-center ml-[6px] opacity-60 transition-opacity duration-200 ease-[ease] group-hover:opacity-100">
                  <button
                    className={`bg-transparent border-0 text-[var(--text-muted)] p-1 rounded-xs cursor-pointer flex items-center justify-center ${BTN_TRANSITION} hover:bg-[color-mix(in_srgb,var(--expense)_25%,transparent)] hover:text-[var(--expense)] light:text-[var(--text-muted)] light:hover:bg-[color-mix(in_srgb,var(--expense)_15%,transparent)] light:hover:text-[var(--expense)]`}
                    onClick={(e) => onDelete(e, sess.id)}
                    title="Xóa đoạn chat này"
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
