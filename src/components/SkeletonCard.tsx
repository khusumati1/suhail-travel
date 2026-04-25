const SkeletonCard = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-2xl bg-muted animate-pulse-soft ${className}`}>
    <div className="h-32 rounded-t-2xl bg-muted-foreground/10" />
    <div className="p-3 space-y-2">
      <div className="h-4 w-3/4 rounded bg-muted-foreground/10" />
      <div className="h-3 w-1/2 rounded bg-muted-foreground/10" />
    </div>
  </div>
);

export default SkeletonCard;
