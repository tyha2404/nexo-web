import { useCallback, useRef, useState } from 'react';
import type { User } from '../../commons/types';
import { useClickOutside } from '../../hooks';
import { CircleUser, ColorMode, KeyRound, LogOut, Settings } from '../ui';
import {
  ACCOUNT_ITEM,
  ACTIVITY_BTN,
  MENU_ITEM,
  MENU_PANEL,
  MOBILE_HEADER_BTN,
} from './shellStyles';
import { cx } from '../ui';

export interface AccountMenuProps {
  /**
   * 'mobile': avatar button in the mobile header, menu drops down, large items.
   * 'desktop': gear button at the bottom of the activity bar, VS Code context menu to its right.
   */
  variant: 'mobile' | 'desktop';
  user: User;
  /** "Giao diện tối" / "Giao diện sáng": the theme the toggle switches to. */
  themeLabel: string;
  onToggleTheme: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

/** Theme / change password / logout menu of the signed-in user. */
export function AccountMenu({
  variant,
  user,
  themeLabel,
  onToggleTheme,
  onChangePassword,
  onLogout,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  const isMobile = variant === 'mobile';
  const toggle = () => setOpen((o) => !o);
  const separator = !isMobile && <div className="mx-1 my-1 h-px bg-line" role="separator" />;
  const itemClass = (danger = false) =>
    isMobile ? `${ACCOUNT_ITEM} ${danger ? 'text-expense' : 'text-main'}` : MENU_ITEM;
  const iconSize = isMobile ? 16 : undefined;

  return (
    <div className="relative" ref={ref}>
      {isMobile ? (
        <button
          className={`${MOBILE_HEADER_BTN} bg-transparent text-main`}
          onClick={toggle}
          aria-label="Tài khoản"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-white">
            {user.username ? user.username[0].toUpperCase() : 'U'}
          </span>
        </button>
      ) : (
        <button
          type="button"
          className={cx(
            ACTIVITY_BTN,
            open ? 'text-activity' : 'text-activity-inactive hover:text-activity'
          )}
          onClick={toggle}
          aria-label="Cài đặt"
          aria-haspopup="menu"
          aria-expanded={open}
          title={`${user.username} · Cài đặt`}
        >
          <Settings size={24} />
        </button>
      )}
      {open && (
        <div
          className={
            isMobile
              ? `${MENU_PANEL} absolute top-[calc(100%+0.4rem)] right-0 max-w-[calc(100vw-2rem)]`
              : `${MENU_PANEL} absolute bottom-1 left-[calc(100%+4px)] origin-bottom-left`
          }
          role="menu"
        >
          {isMobile ? (
            <div className="mb-1 flex min-w-0 flex-col border-b border-line px-2 pt-1 pb-2">
              <span className="text-[15px] font-semibold">{user.username}</span>
              <span className="truncate text-[13px] text-muted">{user.email}</span>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2 px-2 pt-1 pb-2">
              <CircleUser size={16} className="shrink-0 text-muted" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{user.username}</span>
                <span className="truncate text-[12px] text-muted">{user.email}</span>
              </div>
            </div>
          )}
          {separator}
          <button
            type="button"
            role="menuitem"
            className={itemClass()}
            onClick={() => {
              // The phone menu stays open after a theme switch.
              if (!isMobile) close();
              onToggleTheme();
            }}
          >
            <ColorMode size={iconSize} />
            {themeLabel}
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass()}
            onClick={() => {
              close();
              onChangePassword();
            }}
          >
            <KeyRound size={iconSize} /> Đổi mật khẩu
          </button>
          {separator}
          <button
            type="button"
            role="menuitem"
            className={itemClass(true)}
            onClick={() => {
              close();
              onLogout();
            }}
          >
            <LogOut size={iconSize} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
