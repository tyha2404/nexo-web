import type { ReactNode } from 'react';
import { cx, HEADER_ACTIONS, PAGE_HEADER, PAGE_TITLE, PAGE_TITLE_H2 } from '../ui';

export interface PageHeaderProps {
  /** Page title (h2). */
  title: ReactNode;
  /** The page's own create action or page-wide control, on the right. */
  actions?: ReactNode;
  /** Wrapper of `actions` (HEADER_ACTIONS by default). */
  actionsClassName?: string;
  /** Extra classes of the title block. */
  titleClassName?: string;
}

/** Block 1 of every page (ui/layoutStyles): h2 title on the left, actions on the right. */
export function PageHeader({
  title,
  actions,
  actionsClassName = HEADER_ACTIONS,
  titleClassName,
}: PageHeaderProps) {
  return (
    <header className={`${PAGE_HEADER} animate-fade-in`}>
      <div className={cx(PAGE_TITLE, titleClassName)}>
        <h2 className={PAGE_TITLE_H2}>{title}</h2>
      </div>
      {actions && <div className={actionsClassName}>{actions}</div>}
    </header>
  );
}
