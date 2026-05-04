"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { CalendarDays, Stethoscope, UserRound } from "lucide-react"
import AssignDialog from "./AssignDialog"

type Appointment = {
  id:             string
  bookingRef:     string
  patientName:    string
  patientSurname?: string | null
  status:         string
  serviceId:      string
  preferredDate?: Date | null
  assignedDate?:  Date | null
  assignedTime?:  string | null
  slot?:          { date: Date; startTime: string } | null
  service:        { name: string; durationMins: number }
  doctor?:        { name: string } | null
  branch?:        { name: string } | null
}

type Doctor  = { id: string; name: string }
type Filters = { status: string; date: string; doctorId: string }

const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-amber-50  text-amber-700  ring-amber-200",
  APPROVED:  "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-red-50    text-red-600    ring-red-200",
  COMPLETED: "bg-[#EAF3F5] text-[#3A8A97]  ring-[#C5DFE4]",
  NO_SHOW:   "bg-orange-50 text-orange-600 ring-orange-200",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground ring-border"}`}>
      {status.replace("_", " ")}
    </span>
  )
}

function apptDateStr(appt: Appointment): string | null {
  if (appt.assignedDate) return formatDate(appt.assignedDate)
  if (appt.slot?.date)   return formatDate(appt.slot.date)
  if (appt.preferredDate) return `${formatDate(appt.preferredDate)} (pref)`
  return null
}

function apptTimeStr(appt: Appointment): string | null {
  if (appt.assignedTime)     return appt.assignedTime
  if (appt.slot?.startTime)  return appt.slot.startTime
  return null
}

export default function AppointmentTable({ appointments, doctors, filters }: {
  appointments: Appointment[]
  doctors:      Doctor[]
  filters:      Filters
}) {
  const router = useRouter()
  const [rows,         setRows]         = useState(appointments)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [assignTarget, setAssignTarget] = useState<Appointment | null>(null)
  const [loadingId,    setLoadingId]    = useState<string | null>(null)

  function updateFilter(key: keyof Filters, value: string) {
    const params = new URLSearchParams({ ...filters, [key]: value })
    router.push(`?${params.toString()}`)
  }

  async function handleCancel(id: string) {
    setLoadingId(id)
    const res = await fetch(`/api/appointments/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "CANCELLED" }),
    })
    if (res.ok) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: "CANCELLED" } : r))
    }
    setLoadingId(null)
    setCancelTarget(null)
  }

  return (
    <div className="space-y-3">

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="h-8 w-36 rounded-xl border-[#E8D8C5] bg-white text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {["ALL","PENDING","APPROVED","CANCELLED","COMPLETED","NO_SHOW"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All statuses" : s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.date} onValueChange={(v) => updateFilter("date", v)}>
          <SelectTrigger className="h-8 w-30 rounded-xl border-[#E8D8C5] bg-white text-xs">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAY">Today</SelectItem>
            <SelectItem value="WEEK">This week</SelectItem>
            <SelectItem value="ALL">All time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.doctorId} onValueChange={(v) => updateFilter("doctorId", v)}>
          <SelectTrigger className="h-8 w-40 rounded-xl border-[#E8D8C5] bg-white text-xs">
            <SelectValue placeholder="Doctor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All doctors</SelectItem>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} result{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-primary">
              <CalendarDays className="size-3.5" />
            </div>
            <p className="text-sm font-bold text-foreground">Appointments</p>
          </div>
          <span className="text-xs text-muted-foreground">{rows.length} rows</span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <CalendarDays className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">No appointments found</p>
            <p className="mt-1 text-xs text-muted-foreground">Try adjusting the filters above.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3EAE0]">
            {rows.map((appt) => {
              const dateStr = apptDateStr(appt)
              const timeStr = apptTimeStr(appt)
              const fullName = [appt.patientName, appt.patientSurname].filter(Boolean).join(" ")

              return (
                <div
                  key={appt.id}
                  className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center hover:bg-secondary/20 transition-colors"
                >
                  {/* Left — patient + meta */}
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <Link
                        href={`/admin/appointments/${appt.id}`}
                        className="truncate text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {fullName}
                      </Link>
                      <StatusBadge status={appt.status} />
                    </div>

                    {/* Details row */}
                    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{appt.bookingRef}</span>
                      <span className="text-[#D8CFC5]">·</span>
                      <span className="flex items-center gap-1">
                        <Stethoscope className="size-3" />
                        {appt.service.name}
                      </span>
                      {appt.doctor && (
                        <>
                          <span className="text-[#D8CFC5]">·</span>
                          <span className="flex items-center gap-1">
                            <UserRound className="size-3" />
                            {appt.doctor.name}
                          </span>
                        </>
                      )}
                      {dateStr && (
                        <>
                          <span className="text-[#D8CFC5]">·</span>
                          <span>
                            {dateStr}
                            {timeStr && <span className="ml-1 font-medium text-foreground">{timeStr}</span>}
                          </span>
                        </>
                      )}
                      {appt.branch && (
                        <>
                          <span className="text-[#D8CFC5]">·</span>
                          <span>{appt.branch.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right — actions */}
                  <div className="flex items-center gap-1.5">
                    {appt.status === "PENDING" && (
                      <Button
                        size="sm"
                        className="h-7 rounded-lg px-2.5 text-xs"
                        onClick={() => setAssignTarget(appt)}
                      >
                        Assign
                      </Button>
                    )}
                    {["PENDING", "APPROVED"].includes(appt.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg border-red-200 px-2.5 text-xs text-red-600 hover:bg-red-50"
                        disabled={loadingId === appt.id}
                        onClick={() => setCancelTarget(appt.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign dialog */}
      {assignTarget && (
        <AssignDialog
          appointmentId={assignTarget.id}
          serviceId={assignTarget.serviceId}
          serviceName={assignTarget.service.name}
          serviceDurationMins={assignTarget.service.durationMins}
          preferredDate={assignTarget.preferredDate ?? null}
          open={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={(doctorName, _date, time) => {
            setRows((prev) =>
              prev.map((r) =>
                r.id === assignTarget.id
                  ? { ...r, status: "APPROVED", doctor: { name: doctorName }, assignedTime: time }
                  : r,
              ),
            )
          }}
        />
      )}

      {/* Cancel confirm dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cancel this appointment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">The patient will be notified by email.</p>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCancelTarget(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={!!loadingId}
              onClick={() => cancelTarget && handleCancel(cancelTarget)}
            >
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
