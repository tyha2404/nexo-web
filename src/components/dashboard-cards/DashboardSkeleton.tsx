export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton animate-fade-in" aria-busy="true">
      <div className="skeleton skeleton-card" style={{ height: '210px' }} />
      <div className="skeleton" style={{ height: '72px', marginTop: '1rem' }} />
      <div
        className="skeleton-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        <div className="skeleton skeleton-card" style={{ height: '360px' }} />
        <div className="skeleton skeleton-card" style={{ height: '360px' }} />
      </div>
      <div
        className="skeleton-grid2"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        <div className="skeleton skeleton-card" style={{ height: '110px' }} />
        <div className="skeleton skeleton-card" style={{ height: '110px' }} />
        <div className="skeleton skeleton-card" style={{ height: '110px' }} />
      </div>
    </div>
  );
}
