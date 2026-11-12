import type { KeyboardEvent, ReactNode } from 'react';
import { BRAND_CLICKABLE } from './shellStyles';

/** Logo + name that goes to the dashboard (mobile header, desktop title bar). */
export function BrandButton({
  className,
  onHome,
  children,
}: {
  className: string;
  onHome: () => void;
  children: ReactNode;
}) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') onHome();
  };
  return (
    <div
      className={`${className} ${BRAND_CLICKABLE}`}
      onClick={onHome}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Trang chủ Nexo"
    >
      {children}
    </div>
  );
}
