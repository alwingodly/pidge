function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#EDE8E3] ${className ?? ""}`} />
}

export default function BranchesLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Bone className="h-7 w-28" />
          <Bone className="h-4 w-20" />
        </div>
        <Bone className="h-9 w-32 rounded-xl" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-3">
          <Bone className="h-4 w-24" />
          <Bone className="h-4 w-12" />
        </div>
        <div className="divide-y divide-[#F3EAE0]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Bone className="size-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-4 w-36" />
                <Bone className="h-3 w-52" />
              </div>
              <Bone className="h-7 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
