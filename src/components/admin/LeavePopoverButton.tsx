"use client"

import { CalendarOff } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type LeaveEntry = {
  doctor: { id: string; name: string }
  period: string
  reason?: string | null
}

const PERIOD_LABEL: Record<string, string> = {
  FULL:      "Full day",
  MORNING:   "Morning",
  AFTERNOON: "Afternoon",
}

const PERIOD_STYLE: Record<string, string> = {
  FULL:      "bg-slate-100 text-slate-600 ring-slate-200",
  MORNING:   "bg-amber-50 text-amber-700 ring-amber-200",
  AFTERNOON: "bg-blue-50 text-blue-700 ring-blue-200",
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
}

export default function LeavePopoverButton({ leaves }: { leaves: LeaveEntry[] }) {
  const count = leaves.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
        >
          <CalendarOff className="size-3.5" />
          Leave
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-72 p-0 rounded-xl border-border shadow-lg">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">On leave today</p>
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
            <CalendarOff className="size-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No practitioners on leave today.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {leaves.map((l, i) => {
              const periodStyle = PERIOD_STYLE[l.period] ?? PERIOD_STYLE.FULL
              const periodLabel = PERIOD_LABEL[l.period] ?? "Full day"
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-primary">
                    {getInitials(l.doctor.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{l.doctor.name}</p>
                    {l.reason && (
                      <p className="truncate text-[11px] text-muted-foreground">{l.reason}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${periodStyle}`}>
                    {periodLabel}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
