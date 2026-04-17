import { Skeleton } from '@/components/ui/skeleton'

export function RouteLoading() {
  return (
    <div className="space-y-6" aria-label="Carregando página">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="space-y-3 pt-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(4rem,0.8fr)_minmax(8rem,1.5fr)_3rem] gap-4 md:grid-cols-[minmax(5rem,0.8fr)_minmax(10rem,1.5fr)_1fr_3rem] lg:grid-cols-[minmax(5rem,0.8fr)_minmax(10rem,1.5fr)_1fr_1fr_3rem]"
            >
              <Skeleton className="h-5" />
              <Skeleton className="h-5" />
              <Skeleton className="hidden h-5 md:block" />
              <Skeleton className="hidden h-5 lg:block" />
              <Skeleton className="ml-auto h-8 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
