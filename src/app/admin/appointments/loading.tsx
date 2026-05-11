function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#EDE8E3] ${className ?? ""}`} />
}

export default function AppointmentsLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Bone className="h-7 w-40" />
        <Bone className="h-4 w-24" />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        <Bone className="h-8 w-36 rounded-xl" />
        <Bone className="h-8 w-28 rounded-xl" />
        <Bone className="h-8 w-40 rounded-xl" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-3">
          <Bone className="h-4 w-32" />
          <Bone className="h-4 w-16" />
        </div>
        <div className="divide-y divide-[#F3EAE0]">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Bone className="h-4 w-36" />
                  <Bone className="h-5 w-16 rounded-full" />
                </div>
                <Bone className="h-3 w-64" />
              </div>
              <div className="flex gap-1.5">
                <Bone className="h-7 w-14 rounded-lg" />
                <Bone className="h-7 w-14 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
