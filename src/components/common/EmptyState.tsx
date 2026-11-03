import type { ReactNode } from 'react';
import { BTN_PRIMARY, cx, EMPTY_STATE, Plus } from '../ui';

export interface EmptyStateProps {
  /** Icon rendered at 40px in the muted circle. */
  icon: ReactNode;
  title: string;
  description?: string;
  /** Primary call to action, e.g. "Tạo khoản nợ mới". */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Empty result of a page list (Transactions, Debts, Targets, Categories). */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cx(EMPTY_STATE, 'flex flex-col items-center', className)}>
      <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-hover text-muted [&_svg]:size-8">
        {icon}
      </div>
      <h4 className="m-0 mb-1.5 text-[1.05rem] font-semibold text-main">{title}</h4>
      {description && (
        <p className="m-0 mb-4 max-w-100 text-[0.875rem] text-muted">{description}</p>
      )}
      {actionLabel && onAction && (
        <button type="button" className={BTN_PRIMARY} onClick={onAction}>
          <Plus size={16} /> {actionLabel}
        </button>
      )}
    </div>
  );
}
