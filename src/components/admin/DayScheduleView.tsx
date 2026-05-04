"use client"

import { useState } from "react"
import { CalendarDays, AlertCircle } from "lucide-react"

const DAY_START = 480
const DAY_END   = 1200
const DAY_RANGE = 720

type Appt = {
  id: string
  bookingRef: string
  patientName: string
  assignedTime: string
  durationMins: number
  serviceName: string
}

type DoctorSchedule = {
  id: string
  name: string
  speciality: string
  branchId: string | null
  branchName: string | null
  workingHours: { startTime: string; endTime: string } | null
  appointments: Appt[]
}

type Branch = { id: string; name: string }

function toMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function toPct(mins: number) {
  return `${Math.max(0, Math.min(100, ((mins - DAY_START) / DAY_RANGE) * 100)).toFixed(3)}%`
}

function fmtDur(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}

// Every 2 hours → 7 marks (08, 10, 12, 14, 16, 18, 20)
const hourMarks = Array.from({ length: 7 }, (_, i) => {
  const mins = DAY_START + i * 120
  return { label: `${String(Math.floor(mins / 60)).padStart(2, "0")}:00`, left: toPct(mins) }
})

export default function DayScheduleView({
  doctors,
  branches,
  todayLabel,
  isTenantAdmin,
}: {
  doctors: DoctorSchedule[]
  branches: Branch[]
  todayLabel: string
  isTenantAdmin: boolean
}) {
  const [branchFilter, setBranchFilter] = useState("all")

  const filtered =
    branchFilter === "all"
      ? doctors
      : doctors.filter((d) => d.branchId === branchFilter)

  const now     = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const showNow = nowMins >= DAY_START && nowMins <= DAY_END
  const nowPct  = toPct(nowMins)
  const nowLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

  return (
    <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E3DC] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-primary">
            <CalendarDays className="size-3.5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Today&apos;s activity</p>
            <p className="text-[11px] text-muted-foreground">{todayLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showNow && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-red-500" />
              {nowLabel}
            </span>
          )}
          {isTenantAdmin && branches.length > 1 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-8 rounded-lg border border-[#E8E3DC] bg-white px-2.5 text-xs font-medium text-foreground outline-none"
            >
              <option value="all">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <AlertCircle className="size-4" />
          No active doctors for this branch today.
        </div>
      ) : (
        <>
          {/* Hour ruler */}
          <div className="flex border-b border-[#F3EAE0] bg-[#FDFAF7] px-4 py-1.5">
            <div className="w-36 shrink-0" />
            <div className="relative flex-1">
              {hourMarks.map(({ label, left }) => (
                <span
                  key={label}
                  className="absolute -translate-x-1/2 text-[10px] text-muted-foreground/60"
                  style={{ left }}
                >
                  {label}
                </span>
              ))}
              <div className="h-3.5" />
            </div>
          </div>

          {/* Doctor rows */}
          <div className="divide-y divide-[#F3EAE0]">
            {filtered.map((doc) => {
              const wStart   = doc.workingHours ? toMins(doc.workingHours.startTime) : null
              const wEnd     = doc.workingHours ? toMins(doc.workingHours.endTime)   : null
              const busyMins = doc.appointments.reduce((s, a) => s + a.durationMins, 0)
              const freeMins = wStart !== null && wEnd !== null
                ? Math.max(0, wEnd - wStart - busyMins)
                : 0

              return (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-2">

                  {/* Doctor info — fixed width, two lines max */}
                  <div className="w-36 shrink-0 min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{doc.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {doc.workingHours
                        ? `${doc.workingHours.startTime}–${doc.workingHours.endTime} · ${fmtDur(freeMins)} free`
                        : "Off today"}
                    </p>
                  </div>

                  {/* Timeline — bar + time labels below */}
                  <div className="flex-1 space-y-0.5">
                    <div className="relative h-5 overflow-hidden rounded bg-[#F8F5F1]">
                      {/* Working hours zone */}
                      {wStart !== null && wEnd !== null && (
                        <div
                          className="absolute inset-y-0 bg-secondary"
                          style={{
                            left:  toPct(wStart),
                            width: `${(((wEnd - wStart) / DAY_RANGE) * 100).toFixed(3)}%`,
                          }}
                        />
                      )}

                      {/* Appointment blocks */}
                      {doc.appointments.map((appt) => {
                        const endMins = toMins(appt.assignedTime) + appt.durationMins
                        const endStr  = `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`
                        return (
                          <div
                            key={appt.id}
                            className="absolute inset-y-0.5 overflow-hidden rounded-sm bg-primary"
                            style={{
                              left:  toPct(toMins(appt.assignedTime)),
                              width: `${((appt.durationMins / DAY_RANGE) * 100).toFixed(3)}%`,
                            }}
                            title={`${appt.patientName} · ${appt.assignedTime}–${endStr} · ${appt.serviceName}`}
                          >
                            <span className="block truncate px-1 text-[9px] font-bold leading-4 text-white/90">
                              {appt.assignedTime}
                            </span>
                          </div>
                        )
                      })}

                      {/* Current time line */}
                      {showNow && (
                        <div
                          className="absolute inset-y-0 z-10 w-px bg-red-500 opacity-75"
                          style={{ left: nowPct }}
                        />
                      )}
                    </div>

                    {/* Time range labels under each appointment block */}
                    {doc.appointments.length > 0 && (
                      <div className="relative h-3">
                        {doc.appointments.map((appt) => {
                          const endMins = toMins(appt.assignedTime) + appt.durationMins
                          const endStr  = `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`
                          const midPct  = toPct(toMins(appt.assignedTime) + appt.durationMins / 2)
                          return (
                            <span
                              key={appt.id}
                              className="absolute -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold text-primary"
                              style={{ left: midPct }}
                            >
                              {appt.assignedTime}–{endStr}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Compact stats */}
                  <div className="hidden w-24 shrink-0 text-right sm:block">
                    {doc.workingHours ? (
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-semibold text-primary">{doc.appointments.length}</span>
                        {" appt"}
                        {doc.appointments.length !== 1 ? "s" : ""}
                        {busyMins > 0 && (
                          <> · <span className="text-foreground">{fmtDur(busyMins)}</span></>
                        )}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50">—</p>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
