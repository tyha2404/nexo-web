import { Sparkles } from '../ui';
import { BrandButton } from './BrandButton';
import { MOBILE_HEADER_BTN } from './shellStyles';
import type { ReactNode } from 'react';

export interface MobileHeaderProps {
  /** Short name of the current tab. */
  title: string;
  onHome: () => void;
  onOpenAI: () => void;
  /** The account menu (AccountMenu variant="mobile"). */
  accountMenu: ReactNode;
}

/** Fixed top bar on phones (styled as the VS Code title bar). */
export function MobileHeader({ title, onHome, onOpenAI, accountMenu }: MobileHeaderProps) {
  return (
    <header
      className={`fixed inset-x-0 top-0 z-90 hidden h-[calc(52px+env(safe-area-inset-top,0px))] min-h-[calc(52px+env(safe-area-inset-top,0px))] items-center justify-between border-b border-line bg-titlebar pt-[max(0.4rem,env(safe-area-inset-top,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] pb-[0.4rem] pl-[max(0.85rem,env(safe-area-inset-left,0px))] mobile:flex`}
    >
      <BrandButton className="flex h-10 items-center gap-2" onHome={onHome}>
        <img src="/logo-transparent.svg" className="size-6" alt="Nexo logo" />
        <span className="text-[15px] font-semibold text-main">{title}</span>
      </BrandButton>
      <div className="flex items-center gap-[2px]">
        <button
          className={`${MOBILE_HEADER_BTN} bg-transparent text-main`}
          onClick={onOpenAI}
          aria-label="Trợ lý AI"
          title="Trợ lý Nexo AI"
        >
          <Sparkles size={16} className="text-link" />
        </button>
        {accountMenu}
      </div>
    </header>
  );
}
