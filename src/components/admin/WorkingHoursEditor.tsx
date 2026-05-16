"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Info, Loader2, X } from "lucide-react"

export type DaySchedule = {
  dayOfWeek: number
  startTime: string
  endTime:   string
  isActive:  boolean
}

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function makeDefaultSchedule(startTime = "09:00", endTime = "18:00"): DaySchedule[] {
  return DAYS.map((_, i) => ({
    dayOfWeek: i,
    startTime,
    endTime,
    isActive: i >= 1 && i <= 5,
  }))
}

export const DEFAULT_SCHEDULE = makeDefaultSchedule()

const C = { primary: "var(--primary)", border: "var(--border)" }

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

type Props = {
  doctorId:         string
  clinicStartTime?: string | null
  clinicEndTime?:   string | null
  /** Called after a successful save */
  onSaved?:  () => void
  /** When true the save button reads "Save & finish" — used in the creation wizard */
  isWizard?: boolean
}

export default function WorkingHoursEditor({ doctorId, clinicStartTime, clinicEndTime, onSaved, isWizard }: Props) {
  const router   = useRouter()
  const clinicDefault = makeDefaultSchedule(clinicStartTime ?? "09:00", clinicEndTime ?? "18:00")
  const [schedule, setSchedule] = useState<DaySchedule[]>(clinicDefault)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    setLoading(true)
    setSaved(false)
    fetch(`/api/working-hours?doctorId=${doctorId}`)
      .then((r) => r.json())
      .then((data) => {
        const rows: DaySchedule[] = data.data ?? []
        setSchedule(clinicDefault.map((def) => {
          const match = rows.find((s) => s.dayOfWeek === def.dayOfWeek)
          return match ? { ...def, ...match } : def
        }))
      })
      .finally(() => setLoading(false))
  }, [doctorId])

  function updateDay(dayOfWeek: number, field: keyof DaySchedule, value: string | boolean) {
    setSchedule((prev) => prev.map((d) => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch("/api/working-hours", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ doctorId, schedule }),
    })
    if (res.ok) {
      setSaved(true)
      router.refresh()
      onSaved?.()
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    )
  }

  function effectiveWindow(day: DaySchedule): { start: string; end: string } | null {
    if (!day.isActive) return null
    const s = clinicStartTime && toMins(clinicStartTime) > toMins(day.startTime) ? clinicStartTime : day.startTime
    const e = clinicEndTime   && toMins(clinicEndTime)   < toMins(day.endTime)   ? clinicEndTime   : day.endTime
    return toMins(s) < toMins(e) ? { start: s, end: e } : null
  }

  function durationLabel(start: string, end: string) {
    const mins = toMins(end) - toMins(start)
    if (mins <= 0) return ""
    const h = Math.floor(mins / 60), m = mins % 60
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`
  }

  return (
    <div>
      {clinicStartTime && clinicEndTime && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
          <Info className="size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            Clinic hours: <span className="font-semibold text-foreground">{clinicStartTime} – {clinicEndTime}</span>
            <span className="ml-1">· Patient slots limited to this window</span>
          </p>
        </div>
      )}
      <div className="divide-y divide-[#F3EAE0]">
        {schedule.map((day) => {
          const eff        = effectiveWindow(day)
          const isClipped  = eff && (eff.start !== day.startTime || eff.end !== day.endTime)

          return (
          <div key={day.dayOfWeek} className="px-1 py-3 space-y-1.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateDay(day.dayOfWeek, "isActive", !day.isActive)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all"
                style={{
                  background:  day.isActive ? C.primary : "#fff",
                  borderColor: day.isActive ? C.primary : C.border,
                  color:       day.isActive ? "#fff"    : "#aaa",
                }}
              >
                {day.isActive ? <Check className="size-4" strokeWidth={3} /> : <X className="size-3.5" />}
              </button>

              <p className={`w-24 shrink-0 text-sm font-semibold ${day.isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {DAYS[day.dayOfWeek]}
              </p>

              {day.isActive ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(e) => updateDay(day.dayOfWeek, "startTime", e.target.value)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary/50"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={day.endTime}
                    onChange={(e) => updateDay(day.dayOfWeek, "endTime", e.target.value)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary/50"
                  />
                  <span className="text-xs text-muted-foreground">
                    {durationLabel(day.startTime, day.endTime)}
                  </span>
                </div>
              ) : (
                <p className="flex-1 text-sm text-muted-foreground">Day off</p>
              )}
            </div>

            {/* Effective window — only shown when clinic hours clip this day */}
            {isClipped && eff && (
              <div className="ml-11 flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Effective for booking:</span>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  {eff.start} – {eff.end} · {durationLabel(eff.start, eff.end)}
                </span>
              </div>
            )}
          </div>
        )})}

      </div>

      <div className="mt-4 flex items-center justify-between">
        {saved && !isWizard && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <Check className="size-3" strokeWidth={3} /> Saved
          </span>
        )}
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saving} className="rounded-xl" size="sm">
            {saving
              ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
              : isWizard ? "Save & finish" : "Save schedule"}
          </Button>
        </div>
      </div>
    </div>
  )
}
