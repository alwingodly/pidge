function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#EDE8E3] ${className ?? ""}`} />
}

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Bone className="h-3 w-32" />
          <Bone className="h-7 w-44" />
        </div>
        <Bone className="h-9 w-36" />
      </div>

      {/* Top metric strip + next-up card */}
      <div className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
          <div className="grid sm:grid-cols-4 divide-y sm:divide-x sm:divide-y-0 divide-[#F3EAE0]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <Bone className="h-3 w-20" />
                <Bone className="h-9 w-14" />
                <Bone className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8E3DC] bg-white p-4 shadow-sm space-y-3">
          <Bone className="h-3 w-16" />
          <Bone className="h-8 w-24" />
          <Bone className="h-4 w-32" />
          <Bone className="h-3 w-28" />
        </div>
      </div>

      {/* Today's schedule + needs attention */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-3">
              <Bone className="h-4 w-32" />
              <Bone className="h-5 w-12 rounded-full" />
            </div>
            <div className="divide-y divide-[#F3EAE0]">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-3">
                  <Bone className="h-4 w-14" />
                  <div className="flex-1 space-y-1.5">
                    <Bone className="h-4 w-32" />
                    <Bone className="h-3 w-48" />
                  </div>
                  <Bone className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + quality signal */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-3">
            <Bone className="h-4 w-36" />
            <Bone className="h-3 w-24" />
          </div>
          <div className="px-4 py-6">
            <Bone className="h-40 w-full rounded-xl" />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
          <div className="border-b border-[#F3EAE0] px-4 py-3">
            <Bone className="h-4 w-28" />
          </div>
          <div className="flex items-center justify-center p-6">
            <Bone className="h-36 w-36 rounded-full" />
          </div>
        </div>
      </div>

      {/* Bottom 3 panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
            <div className="border-b border-[#F3EAE0] px-4 py-3">
              <Bone className="h-4 w-28" />
            </div>
            <div className="divide-y divide-[#F3EAE0]">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-3">
                  <Bone className="h-4 w-4 rounded-sm" />
                  <Bone className="h-4 flex-1" />
                  <Bone className="h-5 w-8 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
