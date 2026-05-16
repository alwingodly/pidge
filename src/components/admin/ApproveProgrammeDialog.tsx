"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DatePickerButton } from "@/components/ui/date-picker"
import { AlertCircle, AlertTriangle, Check, ChevronRight, Clock, Loader2 } from "lucide-react"

type Doctor      = { id: string; name: string; speciality: string }
type WorkingH    = { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }
type LeavePeriod = { startDate: string; endDate: string; period: string }

type EditableRow = {
  index:     number
  date:      string       // YYYY-MM-DD
  time:      string       // HH:MM
  freeSlots: string[]
  status:    "free" | "conflict" | "full" | "loading"
}

type Props = {
  appointmentId:       string
  serviceId:           string
  serviceName:         string
  serviceDurationMins: number
  preferredDate:       Date | null
  initialDoctorId?:    string | null
  branchId:            string | null
  open:                boolean
  onClose:             () => void
  onApproved:          () => void
}

function toMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m }

function generateTimes(start: string, end: string, step: number) {
  const times: string[] = []
  let cur = toMins(start)
  const e = toMins(end)
  while (cur < e) {
    times.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`)
    cur += step
  }
  return times
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr + "T00:00:00.000Z").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  })
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

const C = { primary: "var(--primary)", border: "var(--border)", cream: "var(--secondary)" }

export default function ApproveProgrammeDialog({
  appointmentId, serviceId, serviceName, serviceDurationMins,
  preferredDate, initialDoctorId, branchId, open, onClose, onApproved,
}: Props) {
  const [step,           setStep]           = useState<1 | 2>(1)
  const [doctors,        setDoctors]        = useState<Doctor[]>([])
  const [doctorId,       setDoctorId]       = useState(initialDoctorId ?? "")
  const [date,           setDate]           = useState<Date | undefined>(preferredDate ?? undefined)
  const [time,           setTime]           = useState("")
  const [workingHours,   setWorkingHours]   = useState<WorkingH[]>([])
  const [leavePeriods,   setLeavePeriods]   = useState<LeavePeriod[]>([])
  const [loadingHours,   setLoadingHours]   = useState(false)
  const [clinicStart,    setClinicStart]    = useState<string | null>(null)
  const [clinicEnd,      setClinicEnd]      = useState<string | null>(null)
  const [slotInterval,   setSlotInterval]   = useState(30)
  const [lunchStart,     setLunchStart]     = useState<string | null>(null)
  const [lunchEnd,       setLunchEnd]       = useState<string | null>(null)
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [days,           setDays]           = useState("7")
  const [rows,           setRows]           = useState<EditableRow[]>([])
  const [previewed,      setPreviewed]      = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError,   setPreviewError]   = useState<string | null>(null)
  const [submitting,     setSubmitting]     = useState(false)
  const [submitError,    setSubmitError]    = useState<string | null>(null)

  // Reset on open
  useEffect(() => {
    if (!open) return
    setStep(1)
    setDoctorId(initialDoctorId ?? "")
    setDate(preferredDate ?? undefined)
    setTime("")
    setDays("7")
    setRows([])
    setPreviewed(false)
    setPreviewError(null)
    setSubmitError(null)
  }, [open, initialDoctorId, preferredDate])

  // Load doctors
  useEffect(() => {
    if (!open) return
    setLoadingDoctors(true)
    const qs = new URLSearchParams({ serviceId })
    if (branchId) qs.set("branchId", branchId)
    fetch(`/api/doctors?${qs}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setDoctors(d.data ?? []))
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false))
  }, [open, serviceId, branchId])

  // Load working hours + leaves when doctor changes
  useEffect(() => {
    if (!doctorId) { setWorkingHours([]); setLeavePeriods([]); setLoadingHours(false); return }
    setLoadingHours(true)
    setTime("")
    Promise.all([
      fetch(`/api/working-hours?doctorId=${doctorId}`).then(r => r.ok ? r.json() : { data: [] }),
      fetch(`/api/doctor-leave?doctorId=${doctorId}`).then(r => r.ok ? r.json() : { data: [] }),
    ]).then(([wh, lv]) => {
      setWorkingHours(wh.data ?? [])
      setLeavePeriods(lv.data ?? [])
      setClinicStart(wh.clinicStartTime ?? null)
      setClinicEnd(wh.clinicEndTime ?? null)
      setSlotInterval(wh.slotIntervalMins ?? 30)
      setLunchStart(wh.lunchBreakStart ?? null)
      setLunchEnd(wh.lunchBreakEnd ?? null)
    }).catch(() => { setWorkingHours([]); setLeavePeriods([]) })
    .finally(() => setLoadingHours(false))
  }, [doctorId])

  function isDateDisabled(d: Date) {
    const today = new Date(new Date().setHours(0, 0, 0, 0))
    if (d < today) return true
    if (workingHours.length > 0 && !workingHours.some(h => h.dayOfWeek === d.getDay() && h.isActive)) return true
    const ds = localDateStr(d)
    return leavePeriods.some(l => l.period === "FULL" && l.startDate.slice(0, 10) <= ds && l.endDate.slice(0, 10) >= ds)
  }

  // Generate time suggestions for the selected date
  const suggestedTimes: string[] = (() => {
    if (!date || !doctorId) return []
    const dow = date.getDay()
    const wh  = workingHours.find(w => w.dayOfWeek === dow && w.isActive)
    const rawStart = wh?.startTime ?? clinicStart
    const rawEnd   = wh?.endTime   ?? clinicEnd
    if (!rawStart || !rawEnd) return []
    return lunchStart && lunchEnd
      ? [...generateTimes(rawStart, lunchStart, slotInterval), ...generateTimes(lunchEnd, rawEnd, slotInterval)]
      : generateTimes(rawStart, rawEnd, slotInterval)
  })()

  async function fetchPreview() {
    if (!doctorId || !date || !time) return
    setLoadingPreview(true)
    setPreviewError(null)
    setPreviewed(false)
    const qs = new URLSearchParams({
      doctorId,
      startDate: localDateStr(date),
      frequency: "DAILY",
      sessions:  days,
      time,
      serviceId,
    })
    try {
      const res  = await fetch(`/api/admin/schedule-preview?${qs}`)
      const data = await res.json()
      if (!res.ok) { setPreviewError(data.error ?? "Could not load preview."); return }
      setRows((data.days ?? []).map((d: { index: number; date: string; suggestedTime: string | null; freeSlots: string[]; status: "free" | "conflict" | "full" }) => ({
        index:     d.index,
        date:      d.date,
        time:      d.suggestedTime ?? time,
        freeSlots: d.freeSlots,
        status:    d.status,
      })))
      setPreviewed(true)
    } catch {
      setPreviewError("Network error. Please try again.")
    } finally {
      setLoadingPreview(false)
    }
  }

  async function refetchRow(rowIndex: number, newDate: string) {
    setRows(prev => prev.map((r, i) => i === rowIndex ? { ...r, date: newDate, status: "loading" } : r))
    const qs = new URLSearchParams({
      doctorId, startDate: newDate, frequency: "DAILY", sessions: "1",
      time: rows[rowIndex]?.time ?? time, serviceId,
    })
    try {
      const res  = await fetch(`/api/admin/schedule-preview?${qs}`)
      const data = await res.json()
      const day  = data.days?.[0]
      if (!day) return
      setRows(prev => prev.map((r, i) => i === rowIndex ? {
        ...r, date: day.date,
        time:      day.suggestedTime ?? day.freeSlots[0] ?? r.time,
        freeSlots: day.freeSlots,
        status:    day.status,
      } : r))
    } catch { /* keep loading cleared */ }
  }

  function setRowTime(rowIndex: number, newTime: string) {
    setRows(prev => prev.map((r, i) => i === rowIndex ? { ...r, time: newTime } : r))
  }

  async function handleConfirm() {
    if (!previewed) return
    const sessions = rows.map(r => ({ date: r.date, time: r.time }))
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res  = await fetch(`/api/appointments/${appointmentId}/approve-programme`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ doctorId, sessions }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? "Something went wrong."); return }
      onApproved()
    } finally {
      setSubmitting(false)
    }
  }

  const dateIsOff     = !!(date && doctorId && !loadingHours && isDateDisabled(date))
  const canGoToStep2  = !!(doctorId && date && time && !dateIsOff)
  const conflictCount = rows.filter(r => r.status === "conflict").length
  const fullCount     = rows.filter(r => r.status === "full").length

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="flex max-h-[88vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0">

        {/* Header */}
        <div className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="text-sm font-bold text-foreground">Approve as programme</DialogTitle>
          <DialogDescription className="sr-only">Schedule a multi-day programme for this appointment.</DialogDescription>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`font-semibold ${step === 1 ? "text-foreground" : "text-muted-foreground"}`}>
              1. Assign session 1
            </span>
            <ChevronRight className="size-3.5" />
            <span className={`font-semibold ${step === 2 ? "text-foreground" : "text-muted-foreground"}`}>
              2. Preview & confirm
            </span>
          </div>
        </div>

        {/* ── Step 1: Pick doctor, date, time ─────────────────────────────────── */}
        {step === 1 && (
          <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr] overflow-hidden">

            {/* Left — clinician */}
            <div className="flex flex-col overflow-y-auto border-r border-border">
              <p className="sticky top-0 z-10 border-b border-border bg-secondary/60 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur">
                Clinician
              </p>
              <div className="flex-1 p-2 space-y-1">
                {loadingDoctors ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Loading…
                  </div>
                ) : doctors.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    No clinicians offer this service.
                  </p>
                ) : doctors.map(d => {
                  const selected = doctorId === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => { setDoctorId(d.id); setTime("") }}
                      className="flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all"
                      style={{
                        borderColor: selected ? C.primary : "transparent",
                        background:  selected ? C.cream   : "transparent",
                      }}
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] font-bold text-primary">
                        {initials(d.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">{d.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground leading-tight">{d.speciality}</p>
                      </div>
                      {selected && <Check className="size-3.5 shrink-0 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right — date + time */}
            <div className="flex flex-col gap-0 overflow-y-auto">
              <div className="border-b border-border px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Session 1 date</p>
                {loadingHours && doctorId ? (
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Loading availability…
                  </div>
                ) : (
                  <DatePickerButton
                    value={date}
                    onChange={d => { setDate(d); setTime("") }}
                    placeholder="Pick a date"
                    disabled={isDateDisabled}
                  />
                )}
                {!loadingHours && date && doctorId && isDateDisabled(date) && (
                  <p className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    This day is off or on leave for the selected clinician — please pick another date.
                  </p>
                )}
              </div>

              <div className="flex-1 px-4 py-3 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Session 1 time</p>

                {suggestedTimes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTimes.map(t => {
                      const selected = time === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTime(t)}
                          className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all"
                          style={
                            selected
                              ? { background: C.primary, color: "#fff", borderColor: C.primary }
                              : { background: "#fff", color: "#444", borderColor: C.border }
                          }
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                ) : doctorId && date ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    No working hours set for this day. Enter a time below.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {!doctorId ? "Select a clinician first." : "Pick a date to see available times."}
                  </p>
                )}

                {/* Custom time */}
                {doctorId && date && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {suggestedTimes.length > 0 ? "Or custom time" : "Enter time"}
                    </p>
                    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      time && !suggestedTimes.includes(time) ? "border-primary bg-primary/5" : "border-border"
                    }`}>
                      <Clock className="size-3.5 text-muted-foreground" />
                      <input
                        type="time"
                        value={suggestedTimes.includes(time) ? "" : time}
                        onChange={e => setTime(e.target.value)}
                        className="flex-1 text-xs font-semibold text-foreground outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Days count + preview ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Selected session 1 summary */}
            <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Session 1</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {doctors.find(d => d.id === doctorId)?.name} · {date ? date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : ""} · {time}
              </p>
            </div>

            {/* Days input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Number of sessions (working days)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={days}
                  onChange={e => { setDays(e.target.value); setPreviewed(false); setRows([]) }}
                  className="h-9 w-24 rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={fetchPreview}
                  disabled={loadingPreview || !days || parseInt(days) < 2}
                >
                  {loadingPreview ? <><Loader2 className="size-3.5 animate-spin" /> Generating…</> : previewed ? "Refresh schedule" : "Generate schedule"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Off days and leaves are automatically skipped. Final schedule will have exactly {days || "N"} working-day sessions.
              </p>
            </div>

            {previewError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle className="size-3.5 shrink-0" /> {previewError}
              </div>
            )}

            {/* Conflict summary */}
            {previewed && (conflictCount > 0 || fullCount > 0) && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {fullCount > 0 && <><strong>{fullCount} day{fullCount !== 1 ? "s" : ""}</strong> fully booked — no free slot found. </>}
                  {conflictCount > 0 && <><strong>{conflictCount} day{conflictCount !== 1 ? "s" : ""}</strong> adjusted to nearest free time. </>}
                  You can change any date or time below.
                </span>
              </div>
            )}

            {/* Editable schedule list */}
            {previewed && rows.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="border-b border-border bg-secondary/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Schedule — {rows.length} sessions — edit any date or time below
                </div>
                <div className="divide-y divide-border/60">
                  {rows.map((row, i) => (
                    <div key={row.index} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-10 shrink-0 text-[11px] font-bold text-muted-foreground">
                        Day {row.index}
                      </span>

                      {/* Editable date */}
                      <input
                        type="date"
                        value={row.date}
                        disabled={row.status === "loading"}
                        onChange={e => refetchRow(i, e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      />

                      {/* Editable time */}
                      {row.status === "loading" ? (
                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                      ) : row.freeSlots.length > 0 ? (
                        <select
                          value={row.time}
                          onChange={e => setRowTime(i, e.target.value)}
                          className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {row.freeSlots.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <input
                          type="time"
                          value={row.time}
                          onChange={e => setRowTime(i, e.target.value)}
                          className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      )}

                      {/* Status badge */}
                      {row.status === "free" && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Free</span>
                      )}
                      {row.status === "conflict" && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">Adjusted</span>
                      )}
                      {row.status === "full" && (
                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">No slot</span>
                      )}
                      {row.status === "loading" && (
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 ring-1 ring-zinc-200">…</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submitError && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" /> {submitError}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => {
              if (step === 2) { setStep(1); setRows([]); setPreviewed(false) }
              else onClose()
            }}>
              {step === 2 ? "Back" : "Cancel"}
            </Button>
            <div className="flex gap-2">
              {step === 1 && (
                <Button
                  size="sm"
                  className="rounded-lg"
                  disabled={!canGoToStep2}
                  onClick={() => setStep(2)}
                >
                  Next — choose sessions
                </Button>
              )}
              {step === 2 && (
                <Button
                  size="sm"
                  className="rounded-lg"
                  disabled={!previewed || rows.length === 0 || submitting}
                  onClick={handleConfirm}
                >
                  {submitting
                    ? <><Loader2 className="size-3.5 animate-spin" /> Approving…</>
                    : previewed
                      ? `Confirm programme (${rows.length} sessions)`
                      : "Generate schedule first"}
                </Button>
              )}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
