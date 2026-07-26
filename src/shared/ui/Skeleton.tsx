export function Skeleton({ className }: { className?: string }) {
  return <div className={`ui-skeleton ${className ?? ""}`} aria-hidden />;
}

export function NoteSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="notes-grid" aria-busy="true" aria-label="Loading notes">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ui-note-card ui-note-card--skeleton">
          <Skeleton className="ui-skel-line ui-skel-line--title" />
          <Skeleton className="ui-skel-line" />
          <Skeleton className="ui-skel-line ui-skel-line--short" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="ui-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ui-list-row ui-list-row--skeleton">
          <Skeleton className="ui-skel-avatar" />
          <div className="ui-list-row__text">
            <Skeleton className="ui-skel-line ui-skel-line--title" />
            <Skeleton className="ui-skel-line ui-skel-line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}
