"use client"

import { useState } from "react"
import { CalendarDays, ChevronDown, ChevronRight, Clock, UserRound } from "lucide-react"
import { format } from "date-fns"
import AppointmentDetailSheet from "@/components/admin/AppointmentDetailSheet"

type Session = {
  id:     string
  index:  number
  date:   string | null
  time:   string | null
  status: string
}

type Programme = {
  groupId:     string
  patientName: string
  service:     string
  doctor:      string
  total:       number
  completed:   number
  cancelled:   number
  firstDate:   string | null
  lastDate:    string | null
  sessions:    Session[]
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED:  "bg-emerald-50 text-emerald-700 ring-emerald-200",
  COMPLETED: "bg-[#EAF3F5] text-[#3A8A97] ring-[#C5DFE4]",
  CANCELLED: "bg-red-50 text-red-600 ring-red-200",
  NO_SHOW:   "bg-orange-50 text-orange-600 ring-orange-200",
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return format(new Date(iso), "d MMM yyyy")
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground">{completed}/{total}</span>
    </div>
  )
}

function programmeStatus(p: Programme): string {
  if (p.completed === p.total) return "Completed"
  if (p.completed > 0)        return "In progress"
  if (p.cancelled === p.total) return "Cancelled"
  return "Upcoming"
}

const PROG_STATUS_STYLE: Record<string, string> = {
  "Completed":   "bg-[#EAF3F5] text-[#3A8A97] ring-[#C5DFE4]",
  "In progress": "bg-blue-50 text-blue-700 ring-blue-200",
  "Cancelled":   "bg-red-50 text-red-600 ring-red-200",
  "Upcoming":    "bg-zinc-100 text-zinc-500 ring-zinc-200",
}

export default function ProgrammesView({ programmes }: { programmes: Programme[] }) {
  const [expanded,          setExpanded]          = useState<Set<string>>(new Set())
  const [selectedApptId,    setSelectedApptId]    = useState<string | null>(null)

  function toggle(groupId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  if (programmes.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="mb-3 size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No programmes yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Expand an approved appointment to create a programme.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#F3EAE0] px-4 py-3">
        <CalendarDays className="size-4 text-muted-foreground" />
        <p className="text-sm font-bold text-foreground">Programmes</p>
        <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {programmes.length}
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#F3EAE0]">
        {programmes.map(p => {
          const isExpanded = expanded.has(p.groupId)
          const pStatus    = programmeStatus(p)

          return (
            <div key={p.groupId}>
              {/* Programme row */}
              <button
                onClick={() => toggle(p.groupId)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/30"
              >
                {/* Expand icon */}
                <div className="shrink-0 text-muted-foreground">
                  {isExpanded
                    ? <ChevronDown className="size-4" />
                    : <ChevronRight className="size-4" />}
                </div>

                {/* Patient + service */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{p.patientName}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${PROG_STATUS_STYLE[pStatus]}`}>
                      {pStatus}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3 shrink-0" />
                      {p.service}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="size-3 shrink-0" />
                      {p.doctor}
                    </span>
                    {p.firstDate && (
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(p.firstDate)} – {fmtDate(p.lastDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                  <span className="text-xs font-semibold text-foreground">{p.total} sessions</span>
                  <ProgressBar completed={p.completed} total={p.total} />
                </div>
              </button>

              {/* Expanded sessions */}
              {isExpanded && (
                <div className="border-t border-[#F3EAE0] bg-secondary/20">
                  {p.sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedApptId(s.id)}
                      className="flex w-full items-center gap-3 px-6 py-2.5 text-left transition-colors hover:bg-secondary/40"
                    >
                      {/* Session number */}
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">
                        {s.index}
                      </div>

                      {/* Date + time */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {s.date ? fmtDate(s.date) : "—"}
                          </span>
                          {s.time && (
                            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                              <Clock className="size-3" />
                              {s.time}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_STYLES[s.status] ?? "bg-muted text-muted-foreground ring-border"}`}>
                        {s.status.replace("_", " ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>

    {/* Appointment detail sheet */}
    <AppointmentDetailSheet
      appointmentId={selectedApptId}
      onClose={() => setSelectedApptId(null)}
    />
    </>
  )
}
