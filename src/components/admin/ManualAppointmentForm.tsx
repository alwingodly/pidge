"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePickerButton } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import RecurringPreviewModal from "@/components/admin/RecurringPreviewModal"

type Service = {
  id: string
  name: string
  durationMins: number
  branchConfigs: { branchId: string; isOffered: boolean; isAvailable: boolean }[]
}
type Doctor = { id: string; name: string; branchId: string | null; doctorServices: { serviceId: string }[] }
type Branch = { id: string; name: string }
type Slot = { id: string; startTime: string; endTime: string; durationMins: number; isBooked: boolean }
type WorkingH = { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }
type BookedSlot = { time: string; durationMins: number }

const GENDER_OPTIONS = [
  { value: "male",           label: "Male" },
  { value: "female",         label: "Female" },
  { value: "non-binary",     label: "Non-binary" },
  { value: "genderqueer",    label: "Genderqueer" },
  { value: "transgender",    label: "Transgender" },
  { value: "self-describe",  label: "Prefer to self-describe" },
  { value: "prefer-not-say", label: "Prefer not to say" },
]

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function generateTimes(startTime: string, endTime: string, stepMins: number) {
  const times: string[] = []
  let cur = toMins(startTime)
  const end = toMins(endTime)
  while (cur + stepMins <= end) {
    times.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`)
    cur += stepMins
  }
  return times
}

function overlaps(candidateStart: string, candidateDuration: number, booked: BookedSlot[]): boolean {
  const cStart = toMins(candidateStart)
  const cEnd = cStart + candidateDuration
  return booked.some(({ time, durationMins }) => {
    const bStart = toMins(time)
    const bEnd = bStart + durationMins
    return cStart < bEnd && cEnd > bStart
  })
}

function dateFromString(value: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function ManualAppointmentForm({
  services,
  doctors,
  branches,
  branchModeEnabled,
  recurrenceEnabled,
  defaultBranchId,
  clinicStartTime,
  clinicEndTime,
  onCreated,
  className,
}: {
  services: Service[]
  doctors: Doctor[]
  branches: Branch[]
  branchModeEnabled:  boolean
  recurrenceEnabled?: boolean
  defaultBranchId?:   string | null
  clinicStartTime?:   string | null
  clinicEndTime?:     string | null
  onCreated?: () => void
  className?: string
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    branchId: defaultBranchId ?? "",
    serviceId: "",
    doctorId: "",
    slotId: "",
    preferredDate: "",
    assignedDate: "",
    assignedTime: "",
    patientName: "",
    patientSurname: "",
    patientEmail: "",
    patientPhone: "",
    patientDOB: "",
    patientGender: "",
    notes: "",
  })
  const [slots,       setSlots]       = useState<Slot[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingH[]>([])
  const [bookedSlots,  setBookedSlots]  = useState<BookedSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingBooked, setLoadingBooked] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // Recurrence state (recurrenceOn = whether the toggle is on, recurrenceEnabled = tenant feature flag from props)
  const [recurrenceOn,        setRecurrenceOn]        = useState(false)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"DAILY" | "WEEKLY" | "FORTNIGHTLY" | "MONTHLY">("WEEKLY")
  const [recurrenceSessions,  setRecurrenceSessions]  = useState(4)
  const [showPreview,         setShowPreview]         = useState(false)

  const visibleServices = useMemo(() => {
    if (!branchModeEnabled || !form.branchId) return services
    return services.filter((service) => {
      const config = service.branchConfigs.find((c) => c.branchId === form.branchId)
      return !config || (config.isOffered && config.isAvailable)
    })
  }, [branchModeEnabled, form.branchId, services])

  const visibleDoctors = useMemo(() => {
    if (!form.serviceId) return []
    return doctors.filter((doctor) => {
      const matchesService = doctor.doctorServices.some((ds) => ds.serviceId === form.serviceId)
      const matchesBranch = !branchModeEnabled || !form.branchId || doctor.branchId === form.branchId
      return matchesService && matchesBranch
    })
  }, [branchModeEnabled, doctors, form.branchId, form.serviceId])

  useEffect(() => {
    setSlots([])
    if (!form.doctorId || !form.serviceId || !form.assignedDate) return

    const params = new URLSearchParams({
      doctorId: form.doctorId,
      serviceId: form.serviceId,
      date: form.assignedDate,
      available: "true",
    })
    if (form.branchId) params.set("branchId", form.branchId)

    setLoadingSlots(true)
    fetch(`/api/slots/by-date?${params}`)
      .then((res) => res.ok ? res.json() : { data: [] })
      .then((data) => setSlots(data.data ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [form.assignedDate, form.branchId, form.doctorId, form.serviceId])

  useEffect(() => {
    setWorkingHours([])
    if (!form.doctorId) return
    fetch(`/api/working-hours?doctorId=${form.doctorId}`)
      .then((res) => res.ok ? res.json() : { data: [] })
      .then((data) => setWorkingHours(data.data ?? []))
      .catch(() => setWorkingHours([]))
  }, [form.doctorId])

  useEffect(() => {
    setBookedSlots([])
    if (!form.doctorId || !form.assignedDate) return
    setLoadingBooked(true)
    fetch(`/api/appointments?doctorId=${form.doctorId}&date=${form.assignedDate}`)
      .then((res) => res.ok ? res.json() : { data: [] })
      .then((data) => {
        const booked: BookedSlot[] = (data.data ?? [])
          .filter((appointment: { assignedTime?: string | null; status: string; service: { durationMins: number } }) =>
            appointment.assignedTime && appointment.status !== "CANCELLED"
          )
          .map((appointment: { assignedTime: string; service: { durationMins: number } }) => ({
            time: appointment.assignedTime,
            durationMins: appointment.service.durationMins,
          }))
        setBookedSlots(booked)
      })
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingBooked(false))
  }, [form.assignedDate, form.doctorId])

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "preferredDate" && !prev.assignedDate ? { assignedDate: value, slotId: "", assignedTime: "" } : {}),
      ...(key === "branchId" ? { serviceId: "", doctorId: "", slotId: "", assignedDate: "", assignedTime: "" } : {}),
      ...(key === "serviceId" ? { doctorId: "", slotId: "", assignedDate: "", assignedTime: "" } : {}),
      ...(key === "doctorId" || key === "assignedDate" ? { slotId: "", assignedTime: "" } : {}),
      ...(key === "slotId" ? { assignedTime: "" } : {}),
    }))
  }

  function selectSlot(slotId: string) {
    const slot = slots.find((item) => item.id === slotId)
    setForm((prev) => ({
      ...prev,
      slotId,
      assignedTime: slot?.startTime ?? "",
    }))
  }

  function selectGeneratedTime(time: string) {
    setForm((prev) => ({
      ...prev,
      slotId: "",
      assignedTime: time,
    }))
  }

  const selectedService = services.find((service) => service.id === form.serviceId)
  const assignedDate = dateFromString(form.assignedDate)
  const preferredDate = dateFromString(form.preferredDate)
  const suggestedTimes = useMemo(() => {
    if (!assignedDate || !form.doctorId || !selectedService) return []
    const wh = workingHours.find((item) => item.dayOfWeek === assignedDate.getDay() && item.isActive)
    const rawStart = wh?.startTime ?? clinicStartTime ?? null
    const rawEnd = wh?.endTime ?? clinicEndTime ?? null
    if (!rawStart || !rawEnd) return []

    const effectiveStart = clinicStartTime && toMins(clinicStartTime) > toMins(rawStart) ? clinicStartTime : rawStart
    const effectiveEnd = clinicEndTime && toMins(clinicEndTime) < toMins(rawEnd) ? clinicEndTime : rawEnd
    return generateTimes(effectiveStart, effectiveEnd, selectedService.durationMins)
  }, [assignedDate, clinicEndTime, clinicStartTime, form.doctorId, selectedService, workingHours])

  const generatedTimes = suggestedTimes.filter((time) =>
    !slots.some((slot) => slot.startTime === time) &&
    !overlaps(time, selectedService?.durationMins ?? 0, bookedSlots)
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const isAssigned = !!(form.doctorId && form.assignedDate && form.assignedTime)

    // Recurring + fully assigned → open preview modal instead of submitting
    if (recurrenceOn && isAssigned && recurrenceSessions >= 2) {
      setShowPreview(true)
      return
    }

    setLoading(true)
    if ((form.doctorId || form.assignedDate || form.assignedTime || form.slotId) && (!form.doctorId || !form.assignedDate || !form.assignedTime)) {
      setError("Choose a clinician, confirmed date, and available time together, or leave them empty to create a pending request.")
      setLoading(false)
      return
    }
    const body: Record<string, unknown> = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value.trim() !== ""),
    )

    const res = await fetch("/api/admin/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(typeof data?.error === "string" ? data.error : "Could not create appointment.")
      setLoading(false)
      return
    }
    if (data?.warning) {
      setError(`Appointment created. Note: ${data.warning}`)
    }
    if (onCreated) {
      onCreated()
    } else {
      router.push("/admin/appointments")
    }
    router.refresh()
  }

  return (
    <>
    <form onSubmit={handleSubmit} className={cn("space-y-5 rounded-xl border border-border bg-white p-5 shadow-sm", className)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" required>
          <Input value={form.patientName} onChange={(e) => update("patientName", e.target.value)} required />
        </Field>
        <Field label="Surname">
          <Input value={form.patientSurname} onChange={(e) => update("patientSurname", e.target.value)} />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.patientEmail} onChange={(e) => update("patientEmail", e.target.value)} required />
        </Field>
        <Field label="Phone" required>
          <Input value={form.patientPhone} onChange={(e) => update("patientPhone", e.target.value)} required />
        </Field>
        <Field label="Date of birth">
          <Input
            type="date"
            max={new Date().toISOString().split("T")[0]}
            value={form.patientDOB}
            onChange={(e) => update("patientDOB", e.target.value)}
          />
        </Field>
        <Field label="Gender identity">
          <Select value={form.patientGender || "UNSPECIFIED"} onValueChange={(v) => update("patientGender", v === "UNSPECIFIED" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UNSPECIFIED">Select...</SelectItem>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {branchModeEnabled && branches.length > 0 && (
          <Field label="Branch">
            <Select value={form.branchId || "NONE"} onValueChange={(v) => update("branchId", v === "NONE" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No branch</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Service" required>
          <Select value={form.serviceId} onValueChange={(v) => update("serviceId", v)} required>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
              {visibleServices.map((service) => (
                <SelectItem key={service.id} value={service.id}>{service.name} · {service.durationMins} min</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {branchModeEnabled && form.branchId && visibleServices.length === 0 && (
            <p className="text-xs text-muted-foreground">No available services at this branch.</p>
          )}
        </Field>
        <Field label="Clinician">
          <Select value={form.doctorId || "UNASSIGNED"} onValueChange={(v) => update("doctorId", v === "UNASSIGNED" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Assign later" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UNASSIGNED">Assign later</SelectItem>
              {visibleDoctors.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!form.serviceId && (
            <p className="text-xs text-muted-foreground">Select a service to show matching clinicians.</p>
          )}
          {form.serviceId && visibleDoctors.length === 0 && (
            <p className="text-xs text-muted-foreground">No clinicians match this service and branch.</p>
          )}
        </Field>
        <Field label="Preferred date">
          <DatePickerButton
            value={preferredDate}
            onChange={(date) => update("preferredDate", date ? localDateStr(date) : "")}
            placeholder="Pick preferred date"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </Field>
        <Field label="Confirmed date">
          <DatePickerButton
            value={assignedDate}
            onChange={(date) => update("assignedDate", date ? localDateStr(date) : "")}
            placeholder="Pick confirmed date"
            disabled={(date) => !form.doctorId || date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
          {!form.doctorId && (
            <p className="text-xs text-muted-foreground">Select a clinician before choosing a confirmed date.</p>
          )}
        </Field>
        <Field label="Confirmed time">
          {form.doctorId && form.assignedDate && (loadingSlots || loadingBooked) && (
            <p className="text-xs text-muted-foreground">Checking availability...</p>
          )}
          {form.doctorId && form.assignedDate && !loadingSlots && slots.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {slots.map((slot) => {
                const taken = overlaps(slot.startTime, selectedService?.durationMins ?? slot.durationMins, bookedSlots)
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={taken}
                    onClick={() => selectSlot(slot.id)}
                    title={taken ? "Already booked" : undefined}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:border-primary disabled:cursor-not-allowed",
                      taken
                        ? "border-[#E0E0E0] bg-[#F5F5F5] text-[#BDBDBD]"
                        : form.slotId === slot.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-foreground",
                    )}
                  >
                    {slot.startTime}
                  </button>
                )
              })}
            </div>
          )}
          {form.doctorId && form.assignedDate && !loadingBooked && generatedTimes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {generatedTimes.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => selectGeneratedTime(time)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:border-primary",
                    form.assignedTime === time && !form.slotId
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground",
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
          {!form.doctorId && (
            <p className="text-xs text-muted-foreground">Select a clinician before choosing a confirmed time.</p>
          )}
          {form.doctorId && !form.assignedDate && (
            <p className="text-xs text-muted-foreground">Select a confirmed date to show available slots.</p>
          )}
          {form.doctorId && form.assignedDate && !loadingSlots && !loadingBooked && slots.length === 0 && generatedTimes.length === 0 && (
            <p className="text-xs text-muted-foreground">No available slots for this clinician on this date.</p>
          )}
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>

      {/* ── Recurrence ── only shown when tenant has it enabled and a full assignment is set */}
      {recurrenceEnabled && !!(form.doctorId && form.assignedDate && form.assignedTime) && (
        <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={recurrenceOn}
              onClick={() => setRecurrenceOn(v => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${recurrenceOn ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform ${recurrenceOn ? "translate-x-4" : "translate-x-0"}`} />
            </button>
            <span className="text-sm font-medium text-foreground">Repeat this appointment</span>
          </label>

          {recurrenceOn && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Frequency</Label>
                <div className="flex gap-2">
                  {(["DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY"] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRecurrenceFrequency(f)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        recurrenceFrequency === f
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-white text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {f === "DAILY" ? "Daily" : f === "WEEKLY" ? "Weekly" : f === "FORTNIGHTLY" ? "Every 2 weeks" : "Monthly"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total sessions</Label>
                  <input
                    type="number"
                    min={2}
                    max={52}
                    value={recurrenceSessions}
                    onChange={e => setRecurrenceSessions(Math.max(2, Math.min(52, Number(e.target.value))))}
                    className="h-9 w-20 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
                  />
                </div>
                {form.assignedDate && (
                  <p className="mt-5 text-xs text-muted-foreground">
                    Creates <span className="font-semibold text-foreground">{recurrenceSessions} appointments</span>
                    {" "}— first on {new Date(form.assignedDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Creating…"
            : recurrenceOn && !!(form.doctorId && form.assignedDate && form.assignedTime)
              ? `Preview ${recurrenceSessions} sessions →`
              : recurrenceOn
                ? `Create ${recurrenceSessions} appointments`
                : "Create appointment"}
        </Button>
        <Link href="/admin/appointments" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Cancel
        </Link>
      </div>
    </form>

    {/* Recurring preview modal — only shown when recurrence + full assignment */}
    <RecurringPreviewModal
      open={showPreview}
      onClose={() => setShowPreview(false)}
      onCreated={() => {
        setShowPreview(false)
        if (onCreated) onCreated()
        else router.push("/admin/appointments")
      }}
      form={form}
      frequency={recurrenceFrequency}
      sessions={recurrenceSessions}
    />
    </>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-primary"> *</span>}</Label>
      {children}
    </div>
  )
}
