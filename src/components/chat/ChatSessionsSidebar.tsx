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
  'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.04)] text-[#94a3b8] hover:bg-[rgba(99,102,241,0.12)] hover:border-[rgba(99,102,241,0.3)] hover:text-[#f8fafc] light:bg-white light:border-[#e2e8f0] light:text-[#475569] light:hover:bg-[#f1f5f9] light:hover:border-[#cbd5e1] light:hover:text-[#0f172a]';
const ROW_SELECTED =
  '[background:linear-gradient(90deg,rgba(99,102,241,0.22)_0%,rgba(168,85,247,0.12)_100%)] border-[rgba(99,102,241,0.5)] text-[#c7d2fe] font-semibold light:[background:#ede9fe] light:border-[#c4b5fd] light:text-[#4f46e5]';

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
          <ListIcon size={15} />
          <span>Lịch sử chat</span>
        </div>
        <button className={SIDEBAR_CLOSE_BTN} onClick={onClose} title="Đóng danh sách lịch sử">
          <CloseIcon size={14} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 px-[14px] py-[10px]">
        <button
          className={`inline-flex items-center gap-[6px] py-[5px] px-[9px] rounded-sm cursor-pointer text-[11.5px] font-semibold bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.3)] text-[#a5b4fc] ${BTN_TRANSITION} hover:bg-[rgba(99,102,241,0.25)] hover:border-[rgba(99,102,241,0.5)] hover:text-white light:bg-[rgba(99,102,241,0.1)] light:border-[rgba(99,102,241,0.25)] light:text-[#4f46e5] light:hover:bg-[rgba(99,102,241,0.18)] light:hover:border-[rgba(99,102,241,0.4)] light:hover:text-[#3730a3]`}
          onClick={onNewChat}
        >
          <PlusIcon size={13} />
          <span>Đoạn chat mới</span>
        </button>
        {sessions.length > 0 && (
          <button
            className={`bg-transparent border-0 text-expense text-[11px] font-semibold cursor-pointer py-1 px-[6px] rounded-xs ${BTN_TRANSITION} hover:bg-[rgba(239,68,68,0.15)]`}
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
                  <ChatBubbleIcon stroke={isSelected ? '#a5b4fc' : '#94a3b8'} />
                  <span title={sess.title}>{sess.title}</span>
                </div>
                <div className="flex items-center ml-[6px] opacity-60 transition-opacity duration-200 ease-[ease] group-hover:opacity-100">
                  <button
                    className={`bg-transparent border-0 text-[#64748b] p-1 rounded-xs cursor-pointer flex items-center justify-center ${BTN_TRANSITION} hover:bg-[rgba(239,68,68,0.25)] hover:text-[#f87171] light:text-[#94a3b8] light:hover:bg-[rgba(239,68,68,0.15)] light:hover:text-[#ef4444]`}
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
