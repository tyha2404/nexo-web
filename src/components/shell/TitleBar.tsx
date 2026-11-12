import { cx, PanelLeft, Search } from '../ui';
import { BrandButton } from './BrandButton';
import { TOOLBAR_BTN } from './shellStyles';

export interface TitleBarProps {
  onHome: () => void;
  onOpenAI: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

/** Desktop title bar with the command center (opens the AI assistant). */
export function TitleBar({ onHome, onOpenAI, sidebarOpen, onToggleSidebar }: TitleBarProps) {
  return (
    <header className="titlebar relative z-60 grid h-[35px] shrink-0 grid-cols-[1fr_minmax(0,600px)_1fr] items-center gap-2 border-b border-line bg-titlebar px-2 text-[13px] text-main mobile:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <BrandButton className="flex items-center gap-2 px-1" onHome={onHome}>
          <img src="/logo-transparent.svg" className="size-4" alt="Nexo logo" />
          <span className="truncate text-[13px] text-main">Nexo Portal</span>
        </BrandButton>
      </div>
      <button
        type="button"
        className="flex h-[24px] w-full min-w-0 cursor-pointer items-center justify-center gap-[6px] rounded-md border border-line bg-[color-mix(in_srgb,var(--bg-input)_60%,transparent)] px-2 text-[12px] text-muted transition-[background-color,border-color]! duration-100! hover:border-line-hover hover:bg-input-hover hover:text-main"
        onClick={onOpenAI}
        aria-label="Trợ lý AI"
        title="Trợ lý Nexo AI (⌘K)"
      >
        <Search size={16} className="shrink-0" />
        <span className="truncate">Nexo — hỏi trợ lý AI về tài chính của bạn</span>
        <kbd className="ml-1 shrink-0 rounded-[3px] border border-line bg-hover px-1 font-sans text-[11px] leading-[16px] text-muted">
          ⌘K
        </kbd>
      </button>
      <div className="flex items-center justify-end gap-[2px]">
        <button
          type="button"
          className={cx(TOOLBAR_BTN, !sidebarOpen && 'text-muted')}
          onClick={onToggleSidebar}
          aria-label="Ẩn/hiện thanh bên"
          aria-pressed={sidebarOpen}
          title="Ẩn/hiện thanh bên (⌘B)"
        >
          <PanelLeft size={16} />
        </button>
      </div>
    </header>
  );
}
