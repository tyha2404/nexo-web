import { CloseIcon, ListIcon, PlusIcon, SparkIcon, WrenchIcon } from './ChatIcons';
import { BTN_TRANSITION, NO_WRAP } from './chatStyles';

const ICON_BTN = `p-[6px] rounded-sm cursor-pointer flex items-center justify-center border ${BTN_TRANSITION}`;
const ICON_BTN_IDLE =
  'bg-transparent border-transparent text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] hover:border-[color-mix(in_srgb,var(--primary)_35%,transparent)] hover:text-[var(--text-link)] light:text-[var(--text-muted)] light:hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] light:hover:border-[color-mix(in_srgb,var(--primary)_25%,transparent)] light:hover:text-[var(--primary)]';
const ICON_BTN_ACTIVE =
  'bg-[color-mix(in_srgb,var(--primary)_25%,transparent)] border-[color-mix(in_srgb,var(--primary)_50%,transparent)] text-[var(--text-link)] light:bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] light:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] light:text-[var(--primary)]';
const iconBtn = (active = false) => `${ICON_BTN} ${active ? ICON_BTN_ACTIVE : ICON_BTN_IDLE}`;

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
    <div className="flex items-center justify-between shrink-0 gap-2 px-4 py-3 bg-[var(--bg-card)] border-b border-[rgba(255,255,255,0.08)] light:bg-[var(--bg-card)] light:border-[var(--border)] mobile:px-[14px] mobile:py-[10px]">
      <div className="flex items-center gap-[10px] min-w-0">
        <div className="relative inline-flex shrink-0">
          <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center text-white shadow-[0_1px_4px_var(--primary-glow)]">
            <SparkIcon />
          </div>
          <span className="absolute -bottom-px -right-px w-[9px] h-[9px] rounded-full bg-[var(--income)] border-2 border-[var(--border)] shadow-[0_0_6px_var(--income)] light:border-[var(--border)]" />
        </div>
        <div className="flex flex-col gap-[2px] min-w-0">
          <div className="flex items-center gap-[7px]">
            <h3 className="m-0 text-[14.5px] font-bold tracking-[-0.2px] text-[var(--text-main)] light:text-[var(--text-main)]">
              Nexo AI
            </h3>
            <span
              className={`inline-flex items-center py-[1.5px] px-[7px] rounded-sm text-[10.5px] font-semibold bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--text-link)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] light:bg-[color-mix(in_srgb,var(--purple)_12%,transparent)] light:text-[var(--primary)] light:border-[var(--purple)] ${NO_WRAP}`}
            >
              Trợ lý tài chính AI
            </span>
          </div>
          <div className="inline-flex items-center gap-[5px] text-[11px] text-income font-medium">
            <span className="w-[6px] h-[6px] rounded-full bg-income shadow-[0_0_8px_var(--income)] animate-[chatPulseDot_2s_infinite_ease-in-out]" />
            <span>Sẵn sàng hỗ trợ</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button className={iconBtn()} onClick={onNewChat} title="Tạo hội thoại mới">
          <PlusIcon size={17} />
        </button>
        <button
          className={iconBtn(showToolsDrawer)}
          onClick={onToggleTools}
          title="Danh sách công cụ AI (Financial Tools)"
        >
          <WrenchIcon size={17} />
        </button>
        <button
          className={iconBtn(showSessionsList)}
          onClick={onToggleSessions}
          title="Lịch sử trò chuyện"
        >
          <ListIcon size={17} />
        </button>
        <button
          className={`${iconBtn()} hover:bg-[color-mix(in_srgb,var(--expense)_18%,transparent)]! hover:border-[color-mix(in_srgb,var(--expense)_35%,transparent)]! hover:text-[var(--expense)]! light:hover:bg-[color-mix(in_srgb,var(--expense)_12%,transparent)]! light:hover:border-[color-mix(in_srgb,var(--expense)_25%,transparent)]! light:hover:text-[var(--expense)]!`}
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
