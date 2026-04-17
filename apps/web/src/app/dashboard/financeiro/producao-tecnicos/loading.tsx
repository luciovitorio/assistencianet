export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-56 bg-muted animate-pulse rounded" />
        <div className="h-4 w-80 bg-muted animate-pulse rounded mt-2" />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="h-3 w-24 bg-muted animate-pulse rounded mb-3" />
            <div className="h-7 w-20 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card shadow-sm h-64 animate-pulse" />
    </div>
  )
}
