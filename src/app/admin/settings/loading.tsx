function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#EDE8E3] ${className ?? ""}`} />
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <Bone className="h-7 w-28" />
        <Bone className="h-4 w-48" />
      </div>

      {[...Array(3)].map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="border-b border-[#F3EAE0] px-4 py-3">
            <Bone className="h-4 w-36" />
          </div>
          <div className="space-y-4 p-4">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="space-y-1.5">
                <Bone className="h-3 w-24" />
                <Bone className="h-10 w-full rounded-xl" />
              </div>
            ))}
            <Bone className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}
