"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatDate, formatTime } from "@/lib/utils"
import { Clock, Stethoscope, UserRound, CalendarDays, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import AssignDialog from "./AssignDialog"
import AppointmentDetailSheet from "./AppointmentDetailSheet"

type Appointment = {
  id:              string
  bookingRef:      string
  patientName:     string
  patientSurname?: string | null
  status:          string
  appointmentType?: string | null
  serviceId:       string
  branchId?:       string | null
  preferredDate?:  Date | null
  assignedDate?:   Date | null
  assignedTime?:   string | null
  checkedInAt?:    Date | null
  slot?:           { date: Date; startTime: string } | null
  service:         { name: string; durationMins: number }
  doctor?:         { id: string; name: string } | null
  branch?:         { name: string } | null
}

type Doctor  = { id: string; name: string; branchId?: string | null; doctorServices?: { serviceId: string }[] }
type Service = { id: string; name: string; durationMins: number; branchConfigs?: { branchId: string; isOffered: boolean; isAvailable: boolean }[] }
type Branch  = { id: string; name: string }

function waitLabel(createdAt: Date | string | undefined): string {
  if (!createdAt) return ""
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
  if (mins < 60)   return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:    "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  CHECKED_IN: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
}

export default function RequestsQueue({
  appointments, doctors, services, branches,
}: {
  appointments: (Appointment & { createdAt?: Date | string })[]
  doctors:      Doctor[]
  services:     Service[]
  branches:     Branch[]
}) {
  const router = useRouter()
  const [rows,         setRows]         = useState(appointments)
  const [assignTarget, setAssignTarget] = useState<Appointment | null>(null)
  const [detailId,     setDetailId]     = useState<string | null>(null)

  useEffect(() => { setRows(appointments) }, [appointments])
  useEffect(() => {
    function onVisible() { if (document.visibilityState === "visible") router.refresh() }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [router])

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
          <Inbox className="size-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">All clear</p>
        <p className="mt-1 text-xs text-muted-foreground">No pending requests or walk-ins waiting.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-[1fr_120px_100px_140px] gap-4 border-b border-border bg-secondary/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Patient</span>
          <span>Service</span>
          <span>Waiting</span>
          <span></span>
        </div>

        <div className="divide-y divide-border/60">
          {rows.map(appt => {
            const fullName   = [appt.patientName, appt.patientSurname].filter(Boolean).join(" ")
            const prefDate   = appt.preferredDate ? formatDate(appt.preferredDate) : null
            const isWalkIn   = appt.appointmentType === "WALK_IN"
            const checkedAt  = appt.checkedInAt
              ? formatTime(new Date(appt.checkedInAt).toTimeString().slice(0, 5))
              : null

            return (
              <div
                key={appt.id}
                className="grid grid-cols-[1fr_120px_100px_140px] items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/20"
              >
                {/* Patient */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDetailId(appt.id)}
                      className="truncate text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {fullName}
                    </button>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[appt.status] ?? ""}`}>
                      {isWalkIn ? "Walk-in" : appt.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="font-mono">{appt.bookingRef}</span>
                    {appt.doctor && (
                      <>
                        <span className="text-border">·</span>
                        <span className="flex items-center gap-1"><UserRound className="size-3" />{appt.doctor.name}</span>
                      </>
                    )}
                    {prefDate && !isWalkIn && (
                      <>
                        <span className="text-border">·</span>
                        <span className="flex items-center gap-1"><CalendarDays className="size-3" />{prefDate} (preferred)</span>
                      </>
                    )}
                    {checkedAt && (
                      <>
                        <span className="text-border">·</span>
                        <span className="flex items-center gap-1"><Clock className="size-3" />Checked in {checkedAt}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Service */}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    <span className="flex items-center gap-1">
                      <Stethoscope className="size-3 shrink-0 text-muted-foreground" />
                      {appt.service.name}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{appt.service.durationMins} min</p>
                </div>

                {/* Wait time */}
                <p className="text-xs font-medium text-muted-foreground">
                  {waitLabel((appt as { createdAt?: Date | string }).createdAt)}
                </p>

                {/* Action */}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    className="h-7 rounded-lg px-3 text-xs"
                    onClick={() => setAssignTarget(appt)}
                  >
                    Assign & approve
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {assignTarget && (
        <AssignDialog
          appointmentId={assignTarget.id}
          serviceId={assignTarget.serviceId}
          serviceName={assignTarget.service.name}
          serviceDurationMins={assignTarget.service.durationMins}
          preferredDate={assignTarget.preferredDate ?? null}
          initialDoctorId={assignTarget.doctor?.id ?? null}
          branchId={assignTarget.branchId ?? null}
          doctors={doctors}
          open={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={(doctorName, _date, time) => {
            setRows(prev =>
              prev.filter(r => r.id !== assignTarget.id)
                  .concat({ ...assignTarget, status: "APPROVED", doctor: { id: "", name: doctorName }, assignedTime: time })
                  .filter(r => ["PENDING", "CHECKED_IN"].includes(r.status))
            )
            setAssignTarget(null)
            router.refresh()
          }}
        />
      )}

      {detailId && (
        <AppointmentDetailSheet
          appointmentId={detailId}
          open={!!detailId}
          onClose={() => { setDetailId(null); router.refresh() }}
        />
      )}
    </>
  )
}
