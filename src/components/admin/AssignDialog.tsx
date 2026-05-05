"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DatePickerButton } from "@/components/ui/date-picker"
import { format } from "date-fns"
import { AlertCircle, Check, Clock, Loader2 } from "lucide-react"

type Doctor   = { id: string; name: string; speciality: string }
type WorkingH = { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }
type BookedSlot = { time: string; durationMins: number }

type Props = {
  appointmentId:       string
  serviceId:           string
  serviceName:         string
  serviceDurationMins: number
  preferredDate:       Date | null
  branchId:            string | null
  open:                boolean
  onClose:             () => void
  onAssigned:          (doctorName: string, date: string, time: string) => void
}

const C = { primary: "#BF4646", border: "#E8DCCB", cream: "#FFF4EA" }

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function generateTimes(startTime: string, endTime: string, stepMins: number) {
  const times: string[] = []
  let cur = toMins(startTime)
  const end = toMins(endTime)
  while (cur < end) {
    times.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`)
    cur += stepMins
  }
  return times
}

// True if the candidate slot overlaps any existing booked slot (duration-aware).
function overlaps(candidateStart: string, candidateDuration: number, booked: BookedSlot[]): boolean {
  const cStart = toMins(candidateStart)
  const cEnd   = cStart + candidateDuration
  return booked.some(({ time, durationMins }) => {
    const bStart = toMins(time)
    const bEnd   = bStart + durationMins
    return cStart < bEnd && cEnd > bStart
  })
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function AssignDialog({
  appointmentId, serviceId, serviceName, serviceDurationMins,
  preferredDate, branchId, open, onClose, onAssigned,
}: Props) {
  const [doctors,        setDoctors]        = useState<Doctor[]>([])
  const [doctorId,       setDoctorId]       = useState("")
  const [date,           setDate]           = useState<Date | undefined>(preferredDate ?? undefined)
  const [time,           setTime]           = useState("")
  const [workingHours,   setWorkingHours]   = useState<WorkingH[]>([])
  const [bookedSlots,    setBookedSlots]    = useState<BookedSlot[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [loadingBooked,  setLoadingBooked]  = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  // Load doctors who offer this service
  useEffect(() => {
    if (!open) return
    setLoadingDoctors(true)
    const qs = new URLSearchParams({ serviceId })
    if (branchId) qs.set("branchId", branchId)
    fetch(`/api/doctors?${qs}`)
      .then((r) => r.json())
      .then((d) => setDoctors(d.data ?? []))
      .finally(() => setLoadingDoctors(false))
  }, [open, serviceId])

  // Load working hours when doctor changes
  useEffect(() => {
    if (!doctorId) { setWorkingHours([]); return }
    fetch(`/api/working-hours?doctorId=${doctorId}`)
      .then((r) => r.json())
      .then((d) => setWorkingHours(d.data ?? []))
  }, [doctorId])

  // Fetch existing assignments for this doctor+date to detect conflicts
  useEffect(() => {
    if (!doctorId || !date) { setBookedSlots([]); return }
    setLoadingBooked(true)
    fetch(`/api/appointments?doctorId=${doctorId}&date=${localDateStr(date)}`)
      .then((r) => r.json())
      .then((d) => {
        const slots: BookedSlot[] = (d.data ?? [])
          .filter((a: { id: string; assignedTime?: string | null; status: string; service: { durationMins: number } }) =>
            a.assignedTime &&
            a.status !== "CANCELLED" &&
            a.id !== appointmentId        // exclude the appointment being assigned
          )
          .map((a: { assignedTime: string; service: { durationMins: number } }) => ({
            time:        a.assignedTime,
            durationMins: a.service.durationMins,
          }))
        setBookedSlots(slots)
      })
      .finally(() => setLoadingBooked(false))
  }, [doctorId, date, appointmentId])

  // Suggested slots from working hours, cleared if doctor changes
  const suggestedTimes: string[] = (() => {
    if (!date || !doctorId) return []
    const dow = date.getDay()
    const wh  = workingHours.find((w) => w.dayOfWeek === dow && w.isActive)
    if (!wh) return []
    return generateTimes(wh.startTime, wh.endTime, serviceDurationMins)
  })()

  const takenCount = suggestedTimes.filter((t) => overlaps(t, serviceDurationMins, bookedSlots)).length
  const selectedDoctor = doctors.find((d) => d.id === doctorId)

  async function handleSubmit() {
    if (!doctorId || !date || !time) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status:       "APPROVED",
          doctorId,
          assignedDate: localDateStr(date),
          assignedTime: time,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return }
      onAssigned(selectedDoctor?.name ?? doctorId, format(date, "d MMM yyyy"), time)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Assign appointment</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Service: <span className="font-semibold text-foreground">{serviceName}</span>
            <span className="ml-2 text-xs">· {serviceDurationMins} min</span>
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Doctor picker */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Clinician</Label>
            {loadingDoctors ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : doctors.length === 0 ? (
              <p className="rounded-xl border border-[#E8D8C5] px-4 py-3 text-sm text-muted-foreground">
                No clinicians offer this service yet. Assign services in Doctor profiles first.
              </p>
            ) : (
              <div className="space-y-1.5">
                {doctors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setDoctorId(d.id); setTime("") }}
                    className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all"
                    style={{
                      borderColor: doctorId === d.id ? C.primary : C.border,
                      background:  doctorId === d.id ? C.cream   : "#fff",
                    }}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-primary">
                      {d.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.speciality}</p>
                    </div>
                    {doctorId === d.id && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Date</Label>
            <DatePickerButton
              value={date}
              onChange={(d) => { setDate(d); setTime("") }}
              placeholder="Pick a date"
            />
          </div>

          {/* Time slots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Time</Label>
              <div className="flex items-center gap-3 text-[11px]">
                {loadingBooked && <span className="text-muted-foreground">Checking availability…</span>}
                {!loadingBooked && takenCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="size-3" />
                    {takenCount} slot{takenCount !== 1 ? "s" : ""} taken
                  </span>
                )}
                {workingHours.length === 0 && doctorId && (
                  <span className="text-amber-600">No working hours set</span>
                )}
              </div>
            </div>

            {suggestedTimes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestedTimes.map((t) => {
                  const taken = overlaps(t, serviceDurationMins, bookedSlots)
                  const selected = time === t
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={taken}
                      onClick={() => setTime(t)}
                      title={taken ? "Already booked" : undefined}
                      className="relative rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all disabled:cursor-not-allowed"
                      style={
                        taken
                          ? { background: "#F5F5F5", color: "#BDBDBD", borderColor: "#E0E0E0" }
                          : selected
                          ? { background: C.primary, color: "#fff", borderColor: C.primary }
                          : { background: "#fff", color: "#444", borderColor: C.border }
                      }
                    >
                      {t}
                      {taken && (
                        <span className="ml-1.5 text-[10px] font-medium text-red-400">Taken</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : doctorId && date ? (
              /* Fallback: no working hours — free-text time input */
              <div className="flex items-center gap-2 rounded-xl border border-[#E8D8C5] px-3 py-2">
                <Clock className="size-4 text-muted-foreground" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="flex-1 text-sm font-semibold text-foreground outline-none"
                />
              </div>
            ) : null}
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            className="rounded-xl"
            disabled={!doctorId || !date || !time || submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? <><Loader2 className="size-4 animate-spin" /> Assigning…</>
              : "Confirm & send email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
