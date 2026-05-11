"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { DEFAULT_SCHEDULE, DAYS, type DaySchedule } from "@/components/admin/WorkingHoursEditor"
import { Check, X, Loader2 } from "lucide-react"

type Branch = { id: string; name: string }

type Props = {
  isTenantAdmin:  boolean
  branches:       Branch[]       // empty for branch admins or single-branch tenants
  doctorCount:    number
}

const C = { primary: "var(--primary)", border: "var(--border)" }

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

export default function BulkScheduleSheet({ isTenantAdmin, branches, doctorCount }: Props) {
  const router  = useRouter()
  const [open,            setOpen]            = useState(false)
  const [schedule,        setSchedule]        = useState<DaySchedule[]>(DEFAULT_SCHEDULE)
  const [targetBranchId,  setTargetBranchId]  = useState<string | null>(null)
  const [saving,          setSaving]          = useState(false)
  const [done,            setDone]            = useState<number | null>(null)
  const [error,           setError]           = useState<string | null>(null)

  const showBranchSelector = isTenantAdmin && branches.length > 0

  function updateDay(dayOfWeek: number, field: keyof DaySchedule, value: string | boolean) {
    setSchedule(prev => prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    setDone(null)
  }

  async function handleSave() {
    setSaving(true); setError(null); setDone(null)
    try {
      const res  = await fetch("/api/working-hours/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ schedule, targetBranchId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return }
      setDone(data.data.updatedDoctors)
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Which doctors will be affected
  const scopeLabel = !showBranchSelector
    ? `all ${doctorCount} active practitioners`
    : targetBranchId
    ? `all active practitioners in ${branches.find(b => b.id === targetBranchId)?.name ?? "selected branch"}`
    : `all ${doctorCount} active practitioners (every branch)`

  return (
    <Sheet open={open} onOpenChange={v => { setOpen(v); if (!v) { setDone(null); setError(null) } }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs">
          <Users className="size-3.5" />
          Set hours for all
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">

        {/* Header */}
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Users className="size-4" />
            </div>
            <div>
              <SheetTitle className="text-sm font-bold text-foreground">Bulk working hours</SheetTitle>
              <p className="text-xs text-muted-foreground">Apply one schedule to multiple practitioners at once.</p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Branch selector — tenant admin only */}
          {showBranchSelector && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Apply to</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetBranchId(null)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    targetBranchId === null
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  All branches
                </button>
                {branches.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setTargetBranchId(b.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      targetBranchId === b.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-white text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scope summary */}
          <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              This schedule will overwrite hours for{" "}
              <span className="font-semibold text-foreground">{scopeLabel}</span>.
            </p>
          </div>

          {/* Schedule editor */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Weekly schedule</p>
            <div className="divide-y divide-[#F3EAE0] rounded-xl border border-border overflow-hidden">
              {schedule.map((day) => (
                <div key={day.dayOfWeek} className="flex items-center gap-3 bg-white px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => updateDay(day.dayOfWeek, "isActive", !day.isActive)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md border transition-all"
                    style={{
                      background:  day.isActive ? C.primary : "#fff",
                      borderColor: day.isActive ? C.primary : C.border,
                      color:       day.isActive ? "#fff"    : "#aaa",
                    }}
                  >
                    {day.isActive ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3" />}
                  </button>

                  <p className={`w-20 shrink-0 text-xs font-semibold ${day.isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {DAYS[day.dayOfWeek]}
                  </p>

                  {day.isActive ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="time"
                        value={day.startTime}
                        onChange={e => updateDay(day.dayOfWeek, "startTime", e.target.value)}
                        className="h-8 flex-1 rounded-lg border border-border px-2 text-xs font-semibold text-foreground outline-none focus:border-primary/50"
                      />
                      <span className="text-[10px] text-muted-foreground">to</span>
                      <input
                        type="time"
                        value={day.endTime}
                        onChange={e => updateDay(day.dayOfWeek, "endTime", e.target.value)}
                        className="h-8 flex-1 rounded-lg border border-border px-2 text-xs font-semibold text-foreground outline-none focus:border-primary/50"
                      />
                      <span className="w-6 text-[10px] text-muted-foreground">
                        {(() => {
                          const mins = toMins(day.endTime) - toMins(day.startTime)
                          if (mins <= 0) return ""
                          const h = Math.floor(mins / 60), m = mins % 60
                          return h > 0 ? `${h}h` : `${m}m`
                        })()}
                      </span>
                    </div>
                  ) : (
                    <p className="flex-1 text-xs text-muted-foreground">Day off</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Success */}
          {done !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <Check className="size-3.5 shrink-0 text-emerald-600" strokeWidth={3} />
              <p className="text-xs text-emerald-800">
                Schedule applied to <span className="font-semibold">{done} practitioner{done !== 1 ? "s" : ""}</span> successfully.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">Existing individual hours will be overwritten.</p>
          <Button
            size="sm"
            className="rounded-lg"
            disabled={saving}
            onClick={handleSave}
          >
            {saving
              ? <><Loader2 className="size-3.5 animate-spin" /> Applying…</>
              : "Apply to all"}
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  )
}
