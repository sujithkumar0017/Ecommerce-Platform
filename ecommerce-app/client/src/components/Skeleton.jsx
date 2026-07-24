// Presentational-only loading placeholders (no logic).
export function SkeletonCard() {
  return (
    <div className="skel-card">
      <div className="skel skel-img" />
      <div className="skel skel-line" style={{ width: '40%' }} />
      <div className="skel skel-line" style={{ width: '80%' }} />
      <div className="skel skel-line" style={{ width: '55%', marginBottom: 16 }} />
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid products-grid">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
