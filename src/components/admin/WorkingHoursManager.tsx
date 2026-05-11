"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react"

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
  isActive:  i >= 1 && i <= 5,
}))

const C = { primary: "var(--primary)", border: "var(--border)", cream: "var(--secondary)" }

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

export default function WorkingHoursManager({ doctors }: { doctors: Doctor[] }) {
  const [open,     setOpen]     = useState(false)
  const [search,   setSearch]   = useState("")
  const [doctorId, setDoctorId] = useState("")
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE)
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  const filtered = search.trim()
    ? doctors.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.speciality.toLowerCase().includes(search.toLowerCase())
      )
    : doctors

  const selectedDoctor = doctors.find((d) => d.id === doctorId)

  useEffect(() => {
    if (!doctorId) return
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
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">

      {/* Header — doctor combobox lives here */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            {selectedDoctor ? `${selectedDoctor.name}'s schedule` : "Weekly schedule"}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedDoctor ? selectedDoctor.speciality : "Select a doctor to edit their schedule"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <Check className="size-3" strokeWidth={3} /> Saved
            </span>
          )}

          {/* Combobox trigger */}
          <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch("") }}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60">
                {selectedDoctor ? (
                  <>
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white">
                      {initials(selectedDoctor.name)}
                    </span>
                    <span className="max-w-40 truncate">{selectedDoctor.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Select doctor…</span>
                )}
                <ChevronDown className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
              </button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-72 p-0">
              {/* Search input */}
              <div className="border-b border-border px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search doctors…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 rounded-lg pl-8 text-sm"
                  />
                </div>
              </div>

              {/* Scrollable list — capped height, works for 1 or 1000 doctors */}
              <div className="max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">No doctors found</p>
                ) : filtered.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setDoctorId(d.id); setSearch(""); setOpen(false) }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/40"
                    style={{ background: doctorId === d.id ? C.cream : undefined }}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-primary">
                      {initials(d.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{d.speciality}</p>
                    </div>
                    {doctorId === d.id && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Body */}
      {!doctorId ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Use the dropdown above to select a clinician and edit their schedule.
          </p>
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

          <div className="flex items-center justify-between border-t border-border bg-secondary/20 px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Changes take effect immediately for new appointment assignments.
            </p>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl" size="sm">
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save schedule"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
