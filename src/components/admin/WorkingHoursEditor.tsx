"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Loader2, X } from "lucide-react"

export type DaySchedule = {
  dayOfWeek: number
  startTime: string
  endTime:   string
  isActive:  boolean
}

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export const DEFAULT_SCHEDULE: DaySchedule[] = DAYS.map((_, i) => ({
  dayOfWeek: i,
  startTime: "09:00",
  endTime:   "18:00",
  isActive:  i >= 1 && i <= 5,
}))

const C = { primary: "#BF4646", border: "#E8DCCB" }

type Props = {
  doctorId:  string
  /** Called after a successful save */
  onSaved?:  () => void
  /** When true the save button reads "Save & finish" — used in the creation wizard */
  isWizard?: boolean
}

export default function WorkingHoursEditor({ doctorId, onSaved, isWizard }: Props) {
  const router = useRouter()
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE)
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
        setSchedule(DEFAULT_SCHEDULE.map((def) => {
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

  return (
    <div>
      <div className="divide-y divide-[#F3EAE0]">
        {schedule.map((day) => (
          <div key={day.dayOfWeek} className="flex items-center gap-3 px-1 py-3">
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
                  className="rounded-lg border border-[#E8D8C5] px-3 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary/50"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="time"
                  value={day.endTime}
                  onChange={(e) => updateDay(day.dayOfWeek, "endTime", e.target.value)}
                  className="rounded-lg border border-[#E8D8C5] px-3 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary/50"
                />
                <span className="text-xs text-muted-foreground">
                  {(() => {
                    const [sh, sm] = day.startTime.split(":").map(Number)
                    const [eh, em] = day.endTime.split(":").map(Number)
                    const mins = (eh * 60 + em) - (sh * 60 + sm)
                    if (mins <= 0) return ""
                    const h = Math.floor(mins / 60), m = mins % 60
                    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`
                  })()}
                </span>
              </div>
            ) : (
              <p className="flex-1 text-sm text-muted-foreground">Day off</p>
            )}
          </div>
        ))}
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
