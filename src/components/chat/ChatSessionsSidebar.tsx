import type { MouseEvent } from 'react';
import type { ChatSession } from '../../services';
import { ChatBubbleIcon, CloseIcon, ListIcon, PlusIcon } from './ChatIcons';

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
    <div className="chat-sessions-sidebar">
      <div className="sessions-sidebar-header">
        <div className="sessions-sidebar-title">
          <ListIcon size={15} />
          <span>Lịch sử chat</span>
        </div>
        <button className="sessions-close-btn" onClick={onClose} title="Đóng danh sách lịch sử">
          <CloseIcon size={14} />
        </button>
      </div>

      <div className="sessions-sidebar-actions">
        <button className="sessions-new-btn" onClick={onNewChat}>
          <PlusIcon size={13} />
          <span>Đoạn chat mới</span>
        </button>
        {sessions.length > 0 && (
          <button className="sessions-clear-btn" onClick={onClearAll} title="Xóa tất cả lịch sử">
            Xóa tất cả
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="sessions-empty">
          <p>Chưa có lịch sử trò chuyện.</p>
        </div>
      ) : (
        <div className="sessions-list-items">
          {sessions.map((sess) => {
            const isSelected = sess.id === currentSessionId;
            return (
              <div
                key={sess.id}
                className={`session-item-row ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(sess.id)}
              >
                <div className="session-item-title">
                  <ChatBubbleIcon stroke={isSelected ? '#a5b4fc' : '#94a3b8'} />
                  <span title={sess.title}>{sess.title}</span>
                </div>
                <div className="session-item-actions">
                  <button
                    className="session-delete-btn"
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
