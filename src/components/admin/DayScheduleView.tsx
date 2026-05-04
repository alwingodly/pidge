"use client"

import { useState, useRef, useEffect } from "react"
import { CalendarDays, AlertCircle } from "lucide-react"

// ── Grid constants ─────────────────────────────────────────────────────────────
const START_H  = 8           // 08:00
const END_H    = 20          // 20:00
const HOUR_PX  = 64          // pixels per hour
const GRID_H   = END_H - START_H
const GRID_PX  = GRID_H * HOUR_PX
const START_M  = START_H * 60
const MIN_PX   = HOUR_PX / 60

const HOURS = Array.from({ length: GRID_H + 1 }, (_, i) => ({
  h:     START_H + i,
  label: `${String(START_H + i).padStart(2, "0")}:00`,
  top:   i * HOUR_PX,
}))

// ── Helpers ────────────────────────────────────────────────────────────────────
function toMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}
function topOf(mins: number)  { return (mins - START_M) * MIN_PX }
function htOf(dur: number)    { return dur * MIN_PX }
function endTime(start: string, dur: number) {
  const e = toMins(start) + dur
  return `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

// ── Types ──────────────────────────────────────────────────────────────────────
type Appt = {
  id: string; bookingRef: string; patientName: string
  assignedTime: string; durationMins: number; serviceName: string
}
type DoctorSchedule = {
  id: string; name: string; speciality: string
  branchId: string | null; branchName: string | null
  workingHours: { startTime: string; endTime: string } | null
  appointments: Appt[]
}
type Branch = { id: string; name: string }

// ── Component ──────────────────────────────────────────────────────────────────
export default function DayScheduleView({
  doctors, branches, todayLabel, isTenantAdmin,
}: {
  doctors: DoctorSchedule[]
  branches: Branch[]
  todayLabel: string
  isTenantAdmin: boolean
}) {
  const [branchFilter, setBranchFilter] = useState("all")
  const scrollRef = useRef<HTMLDivElement>(null)

  const now      = new Date()
  const nowMins  = now.getHours() * 60 + now.getMinutes()
  const showNow  = nowMins > START_M && nowMins < END_H * 60
  const nowTop   = topOf(nowMins)
  const nowLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

  // Scroll so current time is visible near the top on mount
  useEffect(() => {
    if (scrollRef.current && showNow) {
      scrollRef.current.scrollTop = Math.max(0, nowTop - 140)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = branchFilter === "all"
    ? doctors
    : doctors.filter((d) => d.branchId === branchFilter)

  const totalAppts = filtered.reduce((s, d) => s + d.appointments.length, 0)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E3DC] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
            <CalendarDays className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Today's Schedule</p>
            <p className="text-[11px] text-muted-foreground">{todayLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="hidden rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground sm:inline">
            {totalAppts} appt{totalAppts !== 1 ? "s" : ""}
          </span>

          {showNow && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-200">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
              {nowLabel}
            </span>
          )}

          {isTenantAdmin && branches.length > 1 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-8 rounded-lg border border-[#E8E3DC] bg-white px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary/50"
            >
              <option value="all">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <AlertCircle className="size-4" />
          No active doctors for this branch today.
        </div>
      ) : (

        /* ── Calendar grid ─────────────────────────────────────────────────── */
        <div
          ref={scrollRef}
          className="overflow-auto"
          style={{ maxHeight: 520 }}
        >
          {/* inner wrapper sets total width so columns don't collapse */}
          <div style={{ minWidth: 56 + filtered.length * 160 }}>

            {/* ── Doctor header row (sticky top) ─────────────────────────── */}
            <div className="sticky top-0 z-20 flex border-b border-[#E8E3DC] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              {/* corner cell */}
              <div className="w-14 shrink-0 border-r border-[#F0EBE5]" />

              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  className="flex min-w-40 flex-1 items-center gap-2 border-r border-[#F0EBE5] px-3 py-2.5 last:border-r-0"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-primary">
                    {initials(doc.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground leading-tight">{doc.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground leading-tight">
                      {doc.workingHours
                        ? `${doc.workingHours.startTime}–${doc.workingHours.endTime}`
                        : <span className="text-amber-500">Off today</span>}
                    </p>
                  </div>
                  {doc.appointments.length > 0 && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {doc.appointments.length}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* ── Time grid ──────────────────────────────────────────────── */}
            <div className="relative flex" style={{ height: GRID_PX }}>

              {/* Time labels column (sticky left) */}
              <div
                className="sticky left-0 z-10 w-14 shrink-0 border-r border-[#F0EBE5] bg-white"
                style={{ position: "sticky" }}
              >
                {HOURS.map(({ h, label, top }) => (
                  <div
                    key={h}
                    className="absolute right-0 flex w-full items-center justify-end pr-2"
                    style={{ top: top - 7 }}
                  >
                    <span className="text-[9px] font-medium tracking-tight text-muted-foreground/50">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Doctor columns */}
              {filtered.map((doc) => {
                const wStart = doc.workingHours ? toMins(doc.workingHours.startTime) : null
                const wEnd   = doc.workingHours ? toMins(doc.workingHours.endTime)   : null

                return (
                  <div key={doc.id} className="relative min-w-40 flex-1 border-r border-[#F0EBE5] last:border-r-0">

                    {/* Hour lines */}
                    {HOURS.map(({ h, top }) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-[#F0EBE5]"
                        style={{ top }}
                      />
                    ))}
                    {/* Half-hour dashed lines */}
                    {HOURS.slice(0, -1).map(({ h, top }) => (
                      <div
                        key={`${h}h`}
                        className="absolute left-0 right-0"
                        style={{ top: top + HOUR_PX / 2, borderTop: "1px dashed #F5EFE9" }}
                      />
                    ))}

                    {/* Off-hours dimming ─ outside working hours */}
                    {wStart === null ? (
                      <div className="absolute inset-0 bg-[#F9F7F4]" />
                    ) : (
                      <>
                        {wStart > START_M && (
                          <div
                            className="absolute left-0 right-0 bg-[#F9F7F4]"
                            style={{ top: 0, height: topOf(wStart) }}
                          />
                        )}
                        {wEnd !== null && wEnd < END_H * 60 && (
                          <div
                            className="absolute left-0 right-0 bg-[#F9F7F4]"
                            style={{ top: topOf(wEnd), height: GRID_PX - topOf(wEnd) }}
                          />
                        )}
                      </>
                    )}

                    {/* Appointment blocks */}
                    {doc.appointments.map((appt) => {
                      const top    = topOf(toMins(appt.assignedTime))
                      const height = Math.max(htOf(appt.durationMins) - 2, 20)
                      const end    = endTime(appt.assignedTime, appt.durationMins)
                      const isMed  = height >= 30
                      const isTall = height >= 48

                      return (
                        <div
                          key={appt.id}
                          title={`${appt.patientName} · ${appt.assignedTime}–${end} · ${appt.serviceName} · ${appt.bookingRef}`}
                          className="absolute left-1 right-1 cursor-default overflow-hidden rounded-md px-2 py-1 shadow-sm transition-opacity hover:opacity-90"
                          style={{
                            top:    top + 1,
                            height,
                            background: "linear-gradient(160deg, #C94F4F 0%, #9E3636 100%)",
                          }}
                        >
                          <p className="truncate text-[10px] font-bold leading-tight text-white">
                            {appt.assignedTime}{isMed ? `–${end}` : ""}
                          </p>
                          {isMed && (
                            <p className="truncate text-[9px] leading-tight text-white/80">
                              {appt.patientName}
                            </p>
                          )}
                          {isTall && (
                            <p className="truncate text-[9px] leading-tight text-white/60">
                              {appt.serviceName}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {/* ── Current time line (spans all columns) ───────────────── */}
              {showNow && (
                <div
                  className="pointer-events-none absolute z-20 flex items-center"
                  style={{ top: nowTop, left: 56, right: 0 }}
                >
                  <div className="-ml-1 size-2.5 shrink-0 rounded-full bg-red-500 shadow shadow-red-200" />
                  <div className="h-px flex-1 bg-red-500 opacity-75" />
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
