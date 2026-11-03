import { BLOCK_GAP, cx, SKELETON_CARD } from '../ui';

/** Same blocks and spacing as the loaded dashboard. */
export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in" aria-busy="true">
      <div className={cx(SKELETON_CARD, BLOCK_GAP, 'h-[210px]')} />
      <div className={cx(BLOCK_GAP, 'grid grid-cols-[1fr_1fr] gap-3 max-[1025px]:grid-cols-[1fr]')}>
        <div className={cx(SKELETON_CARD, 'h-[360px]')} />
        <div className={cx(SKELETON_CARD, 'h-[360px]')} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <div className={cx(SKELETON_CARD, 'h-[84px]')} />
        <div className={cx(SKELETON_CARD, 'h-[84px]')} />
        <div className={cx(SKELETON_CARD, 'h-[84px]')} />
      </div>
    </div>
  );
}
