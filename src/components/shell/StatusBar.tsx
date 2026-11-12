import type { User } from '../../commons/types';
import { Check, CircleUser, ColorMode, cx, Sparkles, WifiOff } from '../ui';
import { STATUS_ITEM } from './shellStyles';

export interface StatusBarProps {
  user: User;
  online: boolean;
  onHome: () => void;
  onOpenAI: () => void;
  onToggleTheme: () => void;
}

/** Desktop status bar: sync state, AI, currency, user, theme. */
export function StatusBar({ user, online, onHome, onOpenAI, onToggleTheme }: StatusBarProps) {
  return (
    <footer className="flex h-[22px] shrink-0 items-stretch justify-between border-t border-line bg-statusbar text-[12px] text-statusbar-fg mobile:hidden">
      <div className="flex min-w-0 items-stretch">
        <button
          type="button"
          className={`${STATUS_ITEM} bg-statusbar-remote! px-[10px] text-white! hover:brightness-110`}
          onClick={onHome}
          title="Nexo Portal"
        >
          {/* Logo mark (prompt + rising bars) in the status bar's text colour */}
          <svg viewBox="0 0 120 120" className="size-[14px]" aria-hidden="true" fill="currentColor">
            <path
              d="M26 38 L48 60 L26 82"
              fill="none"
              stroke="currentColor"
              strokeWidth="13"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="58" y="66" width="12" height="17" rx="3" />
            <rect x="74" y="53" width="12" height="30" rx="3" />
            <rect x="90" y="37" width="12" height="46" rx="3" />
          </svg>
          <span>Nexo</span>
        </button>
        <span className={cx(STATUS_ITEM, 'cursor-default hover:bg-transparent')} role="status">
          {online ? <Check /> : <WifiOff />}
          {online ? 'Đã đồng bộ' : 'Ngoại tuyến'}
        </span>
      </div>
      <div className="flex min-w-0 items-stretch">
        <button
          type="button"
          className={STATUS_ITEM}
          onClick={onOpenAI}
          title="Trợ lý Nexo AI (⌘K)"
        >
          <Sparkles />
          <span>Nexo AI</span>
        </button>
        <span className={cx(STATUS_ITEM, 'cursor-default hover:bg-transparent')}>VND</span>
        <span
          className={cx(STATUS_ITEM, 'max-w-[220px] cursor-default hover:bg-transparent')}
          title={user.email}
        >
          <CircleUser />
          <span className="truncate">{user.username}</span>
        </span>
        <button
          type="button"
          className={cx(STATUS_ITEM, 'pr-[10px]')}
          onClick={onToggleTheme}
          aria-label="Đổi giao diện sáng/tối"
          title="Đổi giao diện"
        >
          <ColorMode />
        </button>
      </div>
    </footer>
  );
}
