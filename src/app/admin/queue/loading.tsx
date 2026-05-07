export default function QueueLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="h-7 w-44 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-36 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="border-b border-[#F3EAE0] px-4 py-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[#F3EAE0] px-4 py-3 last:border-b-0">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex gap-1.5">
              <div className="h-7 w-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-7 w-16 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
