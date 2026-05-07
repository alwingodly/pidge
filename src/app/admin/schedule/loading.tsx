function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#EDE8E3] ${className ?? ""}`} />
}

export default function ScheduleLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-28" />
        <div className="flex gap-2">
          <Bone className="h-9 w-9 rounded-lg" />
          <Bone className="h-9 w-36 rounded-lg" />
          <Bone className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        {/* Day header row */}
        <div className="grid grid-cols-7 border-b border-[#F3EAE0]">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-2 py-3">
              <Bone className="h-3 w-8" />
              <Bone className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
        {/* Time slots */}
        <div className="divide-y divide-[#F3EAE0]">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-2.5 items-start">
              <Bone className="h-3 w-10 mt-1 shrink-0" />
              <div className="flex-1 grid grid-cols-7 gap-1">
                {[...Array(7)].map((_, j) => (
                  <Bone key={j} className={`h-6 rounded-md ${Math.random() > 0.7 ? "opacity-100" : "opacity-20"}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
