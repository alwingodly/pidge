"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

type Doctor = { id: string; name: string; speciality: string }

type DaySchedule = {
  dayOfWeek: number
  startTime: string
  endTime:   string
  isActive:  boolean
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const DEFAULT_SCHEDULE: DaySchedule[] = DAYS.map((_, i) => ({
  dayOfWeek: i,
  startTime: "09:00",
  endTime:   "18:00",
  isActive:  i >= 1 && i <= 5,   // Mon–Fri active by default
}))

const C = { primary: "#BF4646", border: "#E8DCCB", cream: "#FFF4EA", teal: "#7EACB5" }

export default function WorkingHoursManager({ doctors }: { doctors: Doctor[] }) {
  const [search,    setSearch]    = useState("")
  const [doctorId,  setDoctorId]  = useState("")
  const [schedule,  setSchedule]  = useState<DaySchedule[]>(DEFAULT_SCHEDULE)
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  const filtered = search.trim()
    ? doctors.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.speciality.toLowerCase().includes(search.toLowerCase()))
    : doctors

  const selectedDoctor = doctors.find((d) => d.id === doctorId)

  // Load existing working hours when doctor changes
  useEffect(() => {
    if (!doctorId) return
    setLoading(true)
    setSaved(false)
    fetch(`/api/working-hours?doctorId=${doctorId}`)
      .then((r) => r.json())
      .then((data) => {
        const saved: DaySchedule[] = data.data ?? []
        // Merge saved hours with defaults (so all 7 days are always shown)
        setSchedule(DEFAULT_SCHEDULE.map((def) => {
          const match = saved.find((s) => s.dayOfWeek === def.dayOfWeek)
          return match ? { ...def, ...match } : def
        }))
      })
      .finally(() => setLoading(false))
  }, [doctorId])

  function updateDay(dayOfWeek: number, field: keyof DaySchedule, value: string | boolean) {
    setSchedule((prev) =>
      prev.map((d) => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d)
    )
    setSaved(false)
  }

  async function handleSave() {
    if (!doctorId) return
    setSaving(true)
    const res = await fetch("/api/working-hours", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ doctorId, schedule }),
    })
    if (res.ok) setSaved(true)
    setSaving(false)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">

      {/* Doctor picker */}
      <div className="overflow-hidden rounded-2xl border border-[#E8E3DC] bg-white shadow-sm lg:self-start">
        <div className="border-b border-[#E8E3DC] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Clinicians</p>
        </div>
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg pl-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-96 divide-y divide-[#F3EAE0] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No doctors found</p>
          ) : filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => { setDoctorId(d.id); setSearch("") }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
              style={{ background: doctorId === d.id ? C.cream : undefined }}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-primary">
                {d.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">{d.speciality}</p>
              </div>
              {doctorId === d.id && <Check className="size-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule editor */}
      <div className="overflow-hidden rounded-2xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E8E3DC] px-5 py-3.5">
          <div>
            <p className="text-sm font-bold text-foreground">
              {selectedDoctor ? `${selectedDoctor.name}'s schedule` : "Weekly schedule"}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedDoctor ? "Set working hours per day of the week" : "Select a doctor to edit their schedule"}
            </p>
          </div>
          {saved && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <Check className="size-3" strokeWidth={3} /> Saved
            </span>
          )}
        </div>

        {!doctorId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">Select a clinician from the left to edit their schedule.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading schedule…
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#F3EAE0]">
              {schedule.map((day) => (
                <div key={day.dayOfWeek} className="flex items-center gap-4 px-5 py-4">
                  {/* Toggle */}
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

                  {/* Day label */}
                  <p className={`w-24 shrink-0 text-sm font-semibold ${day.isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {DAYS[day.dayOfWeek]}
                  </p>

                  {/* Time inputs */}
                  {day.isActive ? (
                    <div className="flex flex-1 items-center gap-2">
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

            <div className="border-t border-[#E8E3DC] bg-secondary/20 px-5 py-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Changes take effect immediately for new appointment assignments.
              </p>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl"
                size="sm"
              >
                {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save schedule"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
