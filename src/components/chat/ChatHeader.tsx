import { CloseIcon, ListIcon, PlusIcon, SparkIcon, WrenchIcon } from './ChatIcons';

export interface ChatHeaderProps {
  showToolsDrawer: boolean;
  showSessionsList: boolean;
  onNewChat: () => void;
  onToggleTools: () => void;
  onToggleSessions: () => void;
  onClose: () => void;
}

export function ChatHeader({
  showToolsDrawer,
  showSessionsList,
  onNewChat,
  onToggleTools,
  onToggleSessions,
  onClose,
}: ChatHeaderProps) {
  return (
    <div className="chat-header">
      <div className="chat-header-info">
        <div className="chat-avatar-wrapper">
          <div className="chat-avatar">
            <SparkIcon />
          </div>
          <span className="online-indicator-dot" />
        </div>
        <div className="chat-header-title">
          <div className="chat-header-name-row">
            <h3>Nexo AI</h3>
            <span className="chat-mode-badge">Trợ lý tài chính AI</span>
          </div>
          <div className="chat-status-indicator">
            <span className="online-dot" />
            <span>Sẵn sàng hỗ trợ</span>
          </div>
        </div>
      </div>

      <div className="chat-header-actions">
        <button className="chat-icon-btn" onClick={onNewChat} title="Tạo hội thoại mới">
          <PlusIcon size={17} />
        </button>
        <button
          className={`chat-icon-btn ${showToolsDrawer ? 'active' : ''}`}
          onClick={onToggleTools}
          title="Danh sách công cụ AI (Financial Tools)"
        >
          <WrenchIcon size={17} />
        </button>
        <button
          className={`chat-icon-btn ${showSessionsList ? 'active' : ''}`}
          onClick={onToggleSessions}
          title="Lịch sử trò chuyện"
        >
          <ListIcon size={17} />
        </button>
        <button
          className="chat-icon-btn chat-close-btn"
          onClick={onClose}
          title="Đóng"
          aria-label="Close"
        >
          <CloseIcon size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
