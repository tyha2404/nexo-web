import { SKELETON, SKELETON_CARD } from '../ui';

export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in" aria-busy="true">
      <div className={SKELETON_CARD} style={{ height: '210px' }} />
      <div className={SKELETON} style={{ height: '72px', marginTop: '1rem' }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        <div className={SKELETON_CARD} style={{ height: '360px' }} />
        <div className={SKELETON_CARD} style={{ height: '360px' }} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        <div className={SKELETON_CARD} style={{ height: '110px' }} />
        <div className={SKELETON_CARD} style={{ height: '110px' }} />
        <div className={SKELETON_CARD} style={{ height: '110px' }} />
      </div>
    </div>
  );
}
