import { CloseIcon, ListIcon, PlusIcon, SparkIcon, WrenchIcon } from './ChatIcons';
import { BTN_TRANSITION, NO_WRAP } from './chatStyles';

const ICON_BTN = `p-[6px] rounded-sm cursor-pointer flex items-center justify-center border ${BTN_TRANSITION}`;
const ICON_BTN_IDLE =
  'bg-transparent border-transparent text-[#94a3b8] hover:bg-[rgba(99,102,241,0.18)] hover:border-[rgba(99,102,241,0.35)] hover:text-[#c7d2fe] light:text-[#64748b] light:hover:bg-[rgba(99,102,241,0.1)] light:hover:border-[rgba(99,102,241,0.25)] light:hover:text-[#4f46e5]';
const ICON_BTN_ACTIVE =
  'bg-[rgba(99,102,241,0.25)] border-[rgba(99,102,241,0.5)] text-[#a5b4fc] light:bg-[rgba(99,102,241,0.15)] light:border-[rgba(99,102,241,0.4)] light:text-[#4f46e5]';
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
    <div className="flex items-center justify-between shrink-0 gap-2 px-4 py-3 bg-[#0f172a] border-b border-[rgba(255,255,255,0.08)] light:bg-[#f8fafc] light:border-[#e2e8f0] mobile:px-[14px] mobile:py-[10px]">
      <div className="flex items-center gap-[10px] min-w-0">
        <div className="relative inline-flex shrink-0">
          <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center text-white shadow-[0_1px_4px_var(--primary-glow)]">
            <SparkIcon />
          </div>
          <span className="absolute -bottom-px -right-px w-[9px] h-[9px] rounded-full bg-[#10b981] border-2 border-[#0f172a] shadow-[0_0_6px_#10b981] light:border-[#f8fafc]" />
        </div>
        <div className="flex flex-col gap-[2px] min-w-0">
          <div className="flex items-center gap-[7px]">
            <h3 className="m-0 text-[14.5px] font-bold tracking-[-0.2px] text-[#f8fafc] light:text-[#0f172a]">
              Nexo AI
            </h3>
            <span
              className={`inline-flex items-center py-[1.5px] px-[7px] rounded-sm text-[10.5px] font-semibold bg-[rgba(99,102,241,0.16)] text-[#a5b4fc] border border-[rgba(99,102,241,0.3)] light:bg-[#ede9fe] light:text-[#4f46e5] light:border-[#c4b5fd] ${NO_WRAP}`}
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
          className={`${iconBtn()} hover:bg-[rgba(239,68,68,0.18)]! hover:border-[rgba(239,68,68,0.35)]! hover:text-[#f87171]! light:hover:bg-[rgba(239,68,68,0.12)]! light:hover:border-[rgba(239,68,68,0.25)]! light:hover:text-[#dc2626]!`}
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
