import { cx, ITEM_GAP, SKELETON } from '../ui';

/** Placeholder rows while a page list loads; row height matches a list card. */
export function ListSkeleton({ rows = 6, label }: { rows?: number; label: string }) {
  return (
    <div
      className={cx('flex flex-col animate-fade-in', ITEM_GAP)}
      aria-busy="true"
      aria-label={label}
      role="status"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cx(SKELETON, 'h-14')} />
      ))}
    </div>
  );
}
