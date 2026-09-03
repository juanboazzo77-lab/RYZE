function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-secondary ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Bar className="h-3 w-32" />
        <Bar className="h-7 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bar key={i} className="h-20" />
        ))}
      </div>
      <Bar className="h-56" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Bar className="h-28" />
        <Bar className="h-28" />
      </div>
      <Bar className="h-28" />
    </div>
  );
}
