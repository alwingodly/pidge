"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DatePickerButton } from "@/components/ui/date-picker"
import { format } from "date-fns"
import { AlertCircle, AlertTriangle, Check, Clock, Loader2, RefreshCw } from "lucide-react"

type Doctor        = { id: string; name: string; speciality: string }
type WorkingH      = { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }
type BookedSlot    = { time: string; durationMins: number }
type AvailableSlot = { id: string; startTime: string; endTime: string; durationMins: number }

type SlotState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; available: AvailableSlot[]; booked: BookedSlot[] }

type Props = {
  appointmentId:       string
  serviceId:           string
  serviceName:         string
  serviceDurationMins: number
  preferredDate:       Date | null
  initialDoctorId?:    string | null
  branchId:            string | null
  clinicStartTime?:    string | null
  clinicEndTime?:      string | null
  open:                boolean
  onClose:             () => void
  onAssigned:          (doctorName: string, date: string, time: string) => void
}

const C = { primary: "var(--primary)", border: "var(--border)", cream: "var(--secondary)" }

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

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

function overlaps(cStart: string, cDur: number, booked: BookedSlot[]) {
  const cs = toMins(cStart), ce = cs + cDur
  return booked.some(({ time, durationMins }) => {
    const bs = toMins(time), be = bs + durationMins
    return cs < be && ce > bs
  })
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

export default function AssignDialog({
  appointmentId, serviceId, serviceName, serviceDurationMins,
  preferredDate, initialDoctorId, branchId, clinicStartTime, clinicEndTime,
  open, onClose, onAssigned,
}: Props) {
  const [doctors,          setDoctors]          = useState<Doctor[]>([])
  const [doctorId,         setDoctorId]         = useState(initialDoctorId ?? "")
  const [date,             setDate]             = useState<Date | undefined>(preferredDate ?? undefined)
  const [time,             setTime]             = useState("")
  const [slotId,           setSlotId]           = useState("")
  const [workingHours,     setWorkingHours]     = useState<WorkingH[]>([])
  const [liveClinicStart,  setLiveClinicStart]  = useState<string | null>(clinicStartTime ?? null)
  const [liveClinicEnd,    setLiveClinicEnd]    = useState<string | null>(clinicEndTime   ?? null)
  const [loadingDoctors,   setLoadingDoctors]   = useState(true)
  const [slotState,        setSlotState]        = useState<SlotState>({ status: "idle" })
  const [submitting,       setSubmitting]       = useState(false)
  const [submitError,      setSubmitError]      = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) return
    setDoctorId(initialDoctorId ?? "")
    setDate(preferredDate ?? undefined)
    setTime(""); setSlotId("")
    setSubmitError(null)
    setSlotState({ status: "idle" })
  }, [open, initialDoctorId, preferredDate])

  useEffect(() => {
    if (!open) return
    setLoadingDoctors(true)
    const qs = new URLSearchParams({ serviceId })
    if (branchId) qs.set("branchId", branchId)
    fetch(`/api/doctors?${qs}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => setDoctors(d.data ?? []))
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false))
  }, [branchId, open, serviceId])

  useEffect(() => {
    if (!doctorId) { setWorkingHours([]); return }
    fetch(`/api/working-hours?doctorId=${doctorId}`)
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => {
        setWorkingHours(d.data ?? [])
        // Always use live clinic times from the API — never trust stale props
        setLiveClinicStart(d.clinicStartTime ?? null)
        setLiveClinicEnd(d.clinicEndTime   ?? null)
      })
      .catch(() => setWorkingHours([]))
  }, [doctorId])

  useEffect(() => {
    setTime(""); setSlotId("")
    if (!doctorId || !date) { setSlotState({ status: "idle" }); return }
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setSlotState({ status: "loading" })
    const dateStr = localDateStr(date)
    const slotQs  = new URLSearchParams({ doctorId, serviceId, date: dateStr, available: "true" })
    if (branchId) slotQs.set("branchId", branchId)
    Promise.all([
      fetch(`/api/slots/by-date?${slotQs}`, { signal: abort.signal }).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`/api/appointments?doctorId=${doctorId}&date=${dateStr}`, { signal: abort.signal }).then(r => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([slotsData, apptData]) => {
        const available: AvailableSlot[] = slotsData.data ?? []
        const booked: BookedSlot[] = (apptData.data ?? [])
          .filter((a: { id: string; assignedTime?: string | null; status: string }) =>
            a.assignedTime && a.status !== "CANCELLED" && a.id !== appointmentId)
          .map((a: { assignedTime: string; service: { durationMins: number } }) => ({
            time: a.assignedTime, durationMins: a.service.durationMins,
          }))
        setSlotState({ status: "ready", available, booked })
      })
      .catch(err => {
        if (err?.name === "AbortError") return
        setSlotState({ status: "error", message: "Could not load availability. Try again." })
      })
    return () => abort.abort()
  }, [doctorId, date, serviceId, branchId, appointmentId])

  const isToday  = date ? localDateStr(date) === localDateStr(new Date()) : false
  const nowMins  = new Date().getHours() * 60 + new Date().getMinutes()
  const isPast   = (t: string) => isToday && toMins(t) <= nowMins

  const ready      = slotState.status === "ready"
  const booked     = ready ? slotState.booked   : []
  const availSlots = ready ? slotState.available : []

  const suggestedTimes: string[] = (() => {
    if (!date || !doctorId) return []
    const dow = date.getDay()
    const wh  = workingHours.find(w => w.dayOfWeek === dow && w.isActive)
    const rawStart = wh?.startTime ?? liveClinicStart ?? null
    const rawEnd   = wh?.endTime   ?? liveClinicEnd   ?? null
    if (!rawStart || !rawEnd) return []
    const effStart = liveClinicStart && toMins(liveClinicStart) > toMins(rawStart) ? liveClinicStart : rawStart
    const effEnd   = liveClinicEnd   && toMins(liveClinicEnd)   < toMins(rawEnd)   ? liveClinicEnd   : rawEnd
    return generateTimes(effStart, effEnd, serviceDurationMins).filter(t => !isPast(t))
  })()

  const preCreatedTimes = ready ? availSlots.map(s => s.startTime) : []
  const extraSlotTimes  = preCreatedTimes.filter(t => !suggestedTimes.includes(t))
  const allTimes        = [...suggestedTimes, ...extraSlotTimes].sort()

  function slotForTime(t: string) {
    return ready ? availSlots.find(s => s.startTime === t) : undefined
  }

  const takenCount    = allTimes.filter(t => overlaps(t, serviceDurationMins, booked) || isPast(t)).length
  const allTimesTaken = allTimes.length > 0 && allTimes.every(t => overlaps(t, serviceDurationMins, booked) || isPast(t))
  const selectedDoc   = doctors.find(d => d.id === doctorId)
  const noHours       = doctorId && date && workingHours.length === 0

  async function handleSubmit() {
    if (!doctorId || !date || !time) return
    setSubmitting(true); setSubmitError(null)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APPROVED", doctorId,
          ...(slotId ? { slotId } : {}),
          assignedDate: localDateStr(date),
          assignedTime: time,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setSubmitError(data?.error ?? "Something went wrong."); return }
      onAssigned(selectedDoc?.name ?? doctorId, format(date, "d MMM yyyy"), time)
      onClose()
    } finally { setSubmitting(false) }
  }

  function retrySlots() {
    const d = date; setDate(undefined); setTimeout(() => setDate(d), 0)
  }

  const canConfirm = !!(doctorId && date && time && !isPast(time) && !submitting && slotState.status !== "loading")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[88vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0">

        {/* ── Header ── */}
        <div className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="text-sm font-bold text-foreground">Assign appointment</DialogTitle>
          <DialogDescription className="sr-only">Choose a clinician, date, and time.</DialogDescription>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{serviceName}</span>
              <span className="ml-1.5">· {serviceDurationMins} min</span>
            </span>
            {initialDoctorId && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                Preferred clinician pre-filled
              </span>
            )}
          </div>
        </div>

        {/* ── Body: two-column ── */}
        <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">

          {/* Left — clinician */}
          <div className="flex flex-col gap-0 overflow-y-auto border-r border-border">
            <p className="sticky top-0 z-10 border-b border-border bg-secondary/60 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur">
              Clinician
            </p>
            <div className="flex-1 p-2 space-y-1">
              {loadingDoctors ? (
                <div className="flex items-center gap-2 rounded-lg px-3 py-3 text-xs text-muted-foreground">
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
                    onClick={() => { setDoctorId(d.id); setTime(""); setSlotId("") }}
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

            {/* Date */}
            <div className="border-b border-border px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</p>
              <DatePickerButton
                value={date}
                onChange={d => { setDate(d); setTime(""); setSlotId("") }}
                placeholder="Pick a date"
                disabled={d => d < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>

            {/* Time */}
            <div className="flex-1 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Time</p>
                {ready && takenCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600">
                    <AlertCircle className="size-3" /> {takenCount} taken
                  </span>
                )}
              </div>

              {/* Loading */}
              {slotState.status === "loading" && (
                <div className="flex flex-wrap gap-1.5">
                  {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} className="h-8 w-14 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              )}

              {/* Error */}
              {slotState.status === "error" && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertCircle className="size-3.5 shrink-0 text-red-500" />
                  <p className="flex-1 text-xs text-red-700">Failed to load slots</p>
                  <button onClick={retrySlots} className="flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-600">
                    <RefreshCw className="size-3" /> Retry
                  </button>
                </div>
              )}

              {/* No hours */}
              {slotState.status === "ready" && noHours && allTimes.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  No working hours set. Enter a time manually below.
                </div>
              )}

              {/* All taken */}
              {slotState.status === "ready" && allTimesTaken && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  <AlertCircle className="size-3.5 shrink-0" />
                  All slots booked. Try another date or enter a custom time.
                </div>
              )}

              {/* Time grid */}
              {slotState.status === "ready" && allTimes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {allTimes.map(t => {
                    const preSlot  = slotForTime(t)
                    const taken    = overlaps(t, serviceDurationMins, booked) || isPast(t)
                    const selected = preSlot ? slotId === preSlot.id : (time === t && !slotId)
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={taken}
                        title={isPast(t) ? "Already passed" : taken ? "Already booked" : preSlot ? "Pre-created slot" : undefined}
                        onClick={() => {
                          if (preSlot) { setSlotId(preSlot.id); setTime(t) }
                          else         { setSlotId("");          setTime(t) }
                        }}
                        className="relative rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed"
                        style={
                          taken    ? { background: "#F5F5F5", color: "#BDBDBD", borderColor: "#E0E0E0" }
                          : selected ? { background: C.primary, color: "#fff", borderColor: C.primary }
                          :            { background: "#fff", color: "#444", borderColor: C.border }
                        }
                      >
                        {t}
                        {preSlot && !taken && (
                          <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Legend */}
              {slotState.status === "ready" && availSlots.length > 0 && (
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block size-1.5 rounded-full bg-primary" /> Pre-created slot
                </p>
              )}

              {/* Custom time */}
              {slotState.status === "ready" && doctorId && date && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {suggestedTimes.length > 0 || availSlots.length > 0 ? "Or enter custom time" : "Enter time manually"}
                  </p>
                  <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                    time && !slotId ? "border-primary bg-primary/5" : "border-border"
                  }`}>
                    <Clock className="size-3.5 text-muted-foreground" />
                    <input
                      type="time"
                      value={slotId ? "" : time}
                      min={isToday ? `${String(new Date().getHours()).padStart(2,"0")}:${String(new Date().getMinutes()).padStart(2,"0")}` : undefined}
                      onChange={e => { setSlotId(""); setTime(e.target.value) }}
                      className="flex-1 text-xs font-semibold text-foreground outline-none"
                    />
                  </div>
                  {isToday && time && !slotId && isPast(time) && (
                    <p className="flex items-center gap-1 text-[10px] text-red-600">
                      <AlertCircle className="size-3" /> This time has already passed.
                    </p>
                  )}
                </div>
              )}

              {/* Idle prompt */}
              {slotState.status === "idle" && (
                <p className="text-xs text-muted-foreground">
                  {!doctorId ? "Select a clinician first." : "Pick a date to see available times."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-border px-5 py-3">
          {submitError && (
            <div className="mb-2.5 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
              <AlertCircle className="size-3.5 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{submitError}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="rounded-lg" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="rounded-lg" disabled={!canConfirm} onClick={handleSubmit}>
              {submitting ? <><Loader2 className="size-3.5 animate-spin" /> Assigning…</> : "Confirm & send email"}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
