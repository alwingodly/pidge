"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatTime } from "@/lib/utils"
import { CalendarDays, CheckCircle2, Clock, Stethoscope, UserRound, XCircle } from "lucide-react"
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

type Doctor  = { id: string; name: string }
type Service = { id: string; name: string; durationMins: number }
type Branch  = { id: string; name: string }

const STATUS_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  PENDING:    { badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",   dot: "bg-amber-400",         label: "Pending"    },
  CHECKED_IN: { badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200", dot: "bg-indigo-500",       label: "Checked in" },
  APPROVED:   { badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500",   label: "Confirmed"  },
  COMPLETED:  { badge: "bg-[#EAF3F5] text-[#3A8A97] ring-1 ring-[#C5DFE4]", dot: "bg-[#3A8A97]",        label: "Completed"  },
  NO_SHOW:    { badge: "bg-orange-50 text-orange-600 ring-1 ring-orange-200", dot: "bg-orange-400",       label: "No show"    },
}

function timeStr(appt: Appointment): string | null {
  if (appt.assignedTime)    return formatTime(appt.assignedTime)
  if (appt.slot?.startTime) return formatTime(appt.slot.startTime)
  return null
}

export default function TodaySchedule({
  appointments, doctors: _doctors, services: _services, branches: _branches, initialDetailId,
}: {
  appointments:    Appointment[]
  doctors:         Doctor[]
  services:        Service[]
  branches:        Branch[]
  initialDetailId?: string | null
}) {
  const router     = useRouter()
  const [rows,     setRows]     = useState(appointments)
  const [detailId, setDetailId] = useState<string | null>(initialDetailId ?? null)
  const [loading,  setLoading]  = useState<string | null>(null)

  useEffect(() => { setRows(appointments) }, [appointments])
  useEffect(() => {
    function onVisible() { if (document.visibilityState === "visible") router.refresh() }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [router])

  async function updateStatus(id: string, status: string) {
    setLoading(id)
    const res = await fetch(`/api/appointments/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    })
    if (res.ok) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
    setLoading(null)
  }

  // Separate timed vs unscheduled
  const timed       = rows.filter(a => a.assignedTime || a.slot?.startTime)
  const unscheduled = rows.filter(a => !a.assignedTime && !a.slot?.startTime)

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
          <CalendarDays className="size-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">No appointments today</p>
        <p className="mt-1 text-xs text-muted-foreground">Today&apos;s confirmed and walk-in appointments will appear here.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Timed appointments */}
        {timed.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="grid grid-cols-[80px_1fr_150px_120px_160px] gap-4 border-b border-border bg-secondary/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Time</span><span>Patient</span><span>Service</span><span>Status</span><span>Actions</span>
            </div>
            <div className="divide-y divide-border/60">
              {timed.map(appt => {
                const s        = STATUS_STYLES[appt.status]
                const fullName = [appt.patientName, appt.patientSurname].filter(Boolean).join(" ")
                const t        = timeStr(appt)
                const isActive = ["APPROVED", "CHECKED_IN", "PENDING"].includes(appt.status)
                const isDone   = ["COMPLETED", "NO_SHOW"].includes(appt.status)

                return (
                  <div
                    key={appt.id}
                    className={`grid grid-cols-[80px_1fr_150px_120px_160px] items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/20 ${isDone ? "opacity-55" : ""}`}
                  >
                    {/* Time */}
                    <div className="flex items-center gap-1.5">
                      {s && <span className={`size-1.5 shrink-0 rounded-full ${s.dot}`} />}
                      <span className="font-mono text-sm font-semibold text-foreground">{t ?? "—"}</span>
                    </div>

                    {/* Patient */}
                    <div className="min-w-0">
                      <button
                        onClick={() => setDetailId(appt.id)}
                        className="truncate text-sm font-semibold text-foreground hover:text-primary"
                      >
                        {fullName}
                      </button>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{appt.bookingRef}</span>
                        {appt.doctor && (
                          <>
                            <span className="text-border">·</span>
                            <span className="flex items-center gap-1">
                              <UserRound className="size-3" />{appt.doctor.name}
                            </span>
                          </>
                        )}
                        {appt.appointmentType === "WALK_IN" && (
                          <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600 ring-1 ring-indigo-200">Walk-in</span>
                        )}
                      </div>
                    </div>

                    {/* Service */}
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Stethoscope className="size-3 shrink-0" />
                      {appt.service.name}
                    </p>

                    {/* Status */}
                    {s && (
                      <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.badge}`}>
                        {s.label}
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <>
                          <button
                            disabled={loading === appt.id}
                            onClick={() => updateStatus(appt.id, "COMPLETED")}
                            className="flex h-7 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <CheckCircle2 className="size-3" />
                            Complete
                          </button>
                          <button
                            disabled={loading === appt.id}
                            onClick={() => updateStatus(appt.id, "NO_SHOW")}
                            className="flex h-7 items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 text-[11px] font-semibold text-orange-600 transition-colors hover:bg-orange-100 disabled:opacity-50"
                          >
                            <XCircle className="size-3" />
                            No-show
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Unscheduled / walk-ins without a time */}
        {unscheduled.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-secondary/40 px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Clock className="size-3" /> Awaiting time assignment
              </p>
            </div>
            <div className="divide-y divide-border/60">
              {unscheduled.map(appt => {
                const s        = STATUS_STYLES[appt.status]
                const fullName = [appt.patientName, appt.patientSurname].filter(Boolean).join(" ")

                return (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-secondary/20"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetailId(appt.id)}
                          className="truncate text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {fullName}
                        </button>
                        {s && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.badge}`}>{s.label}</span>}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Stethoscope className="size-3" />{appt.service.name}
                        <span className="text-border">·</span>
                        <span className="font-mono">{appt.bookingRef}</span>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {detailId && (
        <AppointmentDetailSheet
          appointmentId={detailId}
          onClose={() => { setDetailId(null); router.refresh() }}
        />
      )}
    </>
  )
}
