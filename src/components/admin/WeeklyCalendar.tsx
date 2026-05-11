"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ── Grid constants ─────────────────────────────────────────────────────────────
const HOUR_PX = 64
const START_H = 8
const END_H   = 20
const GRID_H  = END_H - START_H           // 12 hours
const GRID_PX = GRID_H * HOUR_PX          // 768 px
const START_M = START_H * 60
const MIN_PX  = HOUR_PX / 60

const HOUR_MARKS = Array.from({ length: GRID_H + 1 }, (_, i) => ({
  h:     START_H + i,
  label: `${String(START_H + i).padStart(2, "0")}:00`,
  top:   i * HOUR_PX,
}))

const WEEK_COLS = [
  { dow: 1, abbr: "Mon" },
  { dow: 2, abbr: "Tue" },
  { dow: 3, abbr: "Wed" },
  { dow: 4, abbr: "Thu" },
  { dow: 5, abbr: "Fri" },
  { dow: 6, abbr: "Sat" },
]

// 8-colour palette – each doctor gets one
const PALETTE = [
  "#3B82F6",  // blue
  "#8B5CF6",  // violet
  "#10B981",  // emerald
  "#F59E0B",  // amber
  "#EC4899",  // pink
  "#06B6D4",  // cyan
  "#BF4646",  // brand red
  "#6366F1",  // indigo
]

const MON_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

// ── Date helpers ───────────────────────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, "0") }

function utcStr(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function getMondayUTC(d: Date): Date {
  const dow  = d.getUTCDay()                    // 0=Sun…6=Sat
  const diff = dow === 0 ? -6 : 1 - dow         // days back to Mon
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff))
}

function addDaysUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n))
}

function weekLabel(mon: Date, sat: Date): string {
  const mM = MON_ABBR[mon.getUTCMonth()]
  const sM = MON_ABBR[sat.getUTCMonth()]
  const y  = sat.getUTCFullYear()
  return mM === sM
    ? `${mon.getUTCDate()} – ${sat.getUTCDate()} ${mM} ${y}`
    : `${mon.getUTCDate()} ${mM} – ${sat.getUTCDate()} ${sM} ${y}`
}

// ── Time helpers ───────────────────────────────────────────────────────────────
function toMins(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}
function topOf(m: number)  { return (m - START_M) * MIN_PX }
function htOf(d: number)   { return d * MIN_PX }
function addMins(t: string, d: number) {
  const e = toMins(t) + d
  return `${pad2(Math.floor(e / 60))}:${pad2(e % 60)}`
}

// ── Types ──────────────────────────────────────────────────────────────────────
type Doc  = { id: string; name: string; speciality: string; branchId: string | null; colorIndex: number }
type Appt = { id: string; bookingRef: string; patientName: string; doctorId: string; date: string; time: string; duration: number; service: string }
type WH   = { doctorId: string; dayOfWeek: number; startTime: string; endTime: string }
type WeekData = { doctors: Doc[]; appointments: Appt[]; workingHours: WH[]; branches: { id: string; name: string }[] }
type Laid = { appt: Appt; col: number; totalCols: number }

// ── Overlap layout (greedy column packing) ─────────────────────────────────────
function computeLayout(appts: Appt[]): Laid[] {
  if (!appts.length) return []
  const sorted = [...appts].sort((a, b) => toMins(a.time) - toMins(b.time))
  const colEnds: number[] = []
  const assigned: { appt: Appt; col: number }[] = []

  for (const a of sorted) {
    const s = toMins(a.time), e = s + a.duration
    let c = colEnds.findIndex((end) => end <= s)
    if (c === -1) { c = colEnds.length; colEnds.push(e) } else { colEnds[c] = e }
    assigned.push({ appt: a, col: c })
  }

  // Per appointment: totalCols = max col used among all overlapping peers + 1
  const result: Laid[] = assigned.map(({ appt, col }, i) => {
    const s = toMins(appt.time), e = s + appt.duration
    let maxCol = col
    for (let j = 0; j < sorted.length; j++) {
      const os = toMins(sorted[j].time), oe = os + sorted[j].duration
      if (s < oe && e > os) maxCol = Math.max(maxCol, assigned[j].col)
    }
    return { appt, col, totalCols: maxCol + 1 }
  })

  return result
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function WeeklyCalendar({ isTenantAdmin }: { isTenantAdmin: boolean }) {
  const [offset,  setOffset]  = useState(0)         // week offset from current
  const [branch,  setBranch]  = useState("all")
  const [hidden,  setHidden]  = useState<Set<string>>(new Set())
  const [data,    setData]    = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const [now,     setNow]     = useState(() => new Date())

  const scrollRef = useRef<HTMLDivElement>(null)

  // Live clock — update now-line every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // ── Week date range ──────────────────────────────────────────────────────────
  const baseMonday = getMondayUTC(new Date())
  const monday     = addDaysUTC(baseMonday, offset * 7)
  const saturday   = addDaysUTC(monday, 5)
  const weekDates  = WEEK_COLS.map((_, i) => addDaysUTC(monday, i))
  const label      = weekLabel(monday, saturday)
  const isThisWeek = offset === 0

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/schedule?start=${utcStr(monday)}&end=${utcStr(saturday)}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset])

  useEffect(() => { load() }, [load])

  // Scroll to current time on initial load
  useEffect(() => {
    if (loading || !scrollRef.current || !isThisWeek) return
    const m = now.getHours() * 60 + now.getMinutes()
    if (m > START_M && m < END_H * 60)
      scrollRef.current.scrollTop = Math.max(0, topOf(m) - 150)
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──────────────────────────────────────────────────────────────────
  const todayStr = utcStr(new Date())
  const nowMins  = now.getHours() * 60 + now.getMinutes()
  const showNow  = isThisWeek && nowMins > START_M && nowMins < END_H * 60
  const nowTop   = topOf(nowMins)
  const nowLabel = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`

  const doctors   = data?.doctors ?? []
  const visDocs   = doctors.filter((d) => (branch === "all" || d.branchId === branch) && !hidden.has(d.id))
  const visDocIds = new Set(visDocs.map((d) => d.id))

  const appointments = (data?.appointments ?? []).filter((a) => visDocIds.has(a.doctorId))
  const workingHours = data?.workingHours ?? []
  const branches     = data?.branches ?? []

  const apptsByDate = new Map<string, Appt[]>()
  for (const a of appointments) {
    const arr = apptsByDate.get(a.date) ?? []; arr.push(a); apptsByDate.set(a.date, arr)
  }

  const totalAppts = appointments.length

  function toggleDoc(id: string) {
    setHidden((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function dayClinicHours(dow: number): { start: number; end: number } | null {
    const rows = workingHours.filter((w) => w.dayOfWeek === dow)
    if (!rows.length) return null
    return { start: Math.min(...rows.map((w) => toMins(w.startTime))), end: Math.max(...rows.map((w) => toMins(w.endTime))) }
  }

  function docColor(doctorId: string) {
    const d = doctors.find((x) => x.id === doctorId)
    return PALETTE[(d?.colorIndex ?? 0) % PALETTE.length]
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">

      {/* ── Navigation bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">

        {/* Week picker */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="w-52 text-center text-sm font-bold tabular-nums text-foreground">
            {label}
          </span>

          <button
            onClick={() => setOffset((o) => o + 1)}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition-colors hover:bg-secondary"
          >
            <ChevronRight className="size-4" />
          </button>

          {!isThisWeek && (
            <button
              onClick={() => setOffset(0)}
              className="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              This week
            </button>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2.5">
          <span className="hidden rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground sm:inline">
            {loading ? "…" : `${totalAppts} appt${totalAppts !== 1 ? "s" : ""}`}
          </span>

          {showNow && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-200">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
              {nowLabel}
            </span>
          )}

          {isTenantAdmin && branches.length > 1 && (
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="h-8 rounded-lg border border-border bg-white px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary/40"
            >
              <option value="all">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Doctor legend / filter ───────────────────────────────────────────── */}
      {doctors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#F3EAE0] bg-secondary/30 px-5 py-2.5">
          <span className="mr-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Doctors
          </span>
          {doctors.map((d) => {
            const off   = hidden.has(d.id)
            const color = PALETTE[d.colorIndex % PALETTE.length]
            return (
              <button
                key={d.id}
                onClick={() => toggleDoc(d.id)}
                title={d.speciality}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold transition-all"
                style={off
                  ? { borderColor: "#E2DDD8", background: "#F5F2EF", color: "#AAA" }
                  : { borderColor: `${color}50`, background: `${color}14`, color }}
              >
                <span className="size-1.5 rounded-full" style={{ background: off ? "#CCC" : color }} />
                {d.name}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Calendar grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <CalendarSkeleton />
      ) : (
        <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: 600 }}>
          {/* inner div sets minimum width so columns never collapse */}
          <div style={{ minWidth: 56 + WEEK_COLS.length * 148 }}>

            {/* ── Day header row (sticky top) ─────────────────────────────── */}
            <div className="sticky top-0 z-20 flex border-b border-border bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
              {/* Corner cell – also sticky left so it pins at the intersection */}
              <div className="sticky left-0 z-30 w-14 shrink-0 border-r border-border bg-white" />

              {WEEK_COLS.map(({ dow, abbr }, i) => {
                const d       = weekDates[i]
                const ds      = utcStr(d)
                const isToday = ds === todayStr
                const count   = (apptsByDate.get(ds) ?? []).length

                return (
                  <div
                    key={dow}
                    className="flex flex-1 flex-col items-center justify-center border-r border-border py-3 last:border-r-0"
                    style={{ minWidth: 148 }}
                  >
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: isToday ? "var(--primary)" : "var(--muted-foreground)" }}
                    >
                      {abbr}
                    </span>

                    <div
                      className="mt-1 flex size-9 items-center justify-center rounded-full text-[17px] font-bold leading-none transition-colors"
                      style={isToday
                        ? { background: "var(--primary)", color: "var(--primary-foreground)" }
                        : { color: "var(--foreground)" }}
                    >
                      {d.getUTCDate()}
                    </div>

                    <div className="mt-1 h-3.5">
                      {count > 0 && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                          style={isToday
                            ? { background: "color-mix(in srgb, var(--primary) 12%, #fff)", color: "var(--primary)" }
                            : { background: "var(--secondary)", color: "var(--muted-foreground)" }}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Time grid ──────────────────────────────────────────────────── */}
            <div className="relative flex" style={{ height: GRID_PX }}>

              {/* Sticky time-label column */}
              <div
                className="sticky left-0 z-10 w-14 shrink-0 border-r border-border bg-white"
              >
                {HOUR_MARKS.map(({ h, label, top }) => (
                  <div
                    key={h}
                    className="absolute right-0 flex w-full items-start justify-end pr-2"
                    style={{ top: top - 7 }}
                  >
                    <span className="text-[9px] font-medium tabular-nums text-muted-foreground/45">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {WEEK_COLS.map(({ dow }, i) => {
                const d       = weekDates[i]
                const ds      = utcStr(d)
                const isToday = ds === todayStr
                const dayAppts = apptsByDate.get(ds) ?? []
                const laid    = computeLayout(dayAppts)
                const clinic  = dayClinicHours(dow)

                return (
                  <div
                    key={dow}
                    className="relative flex-1 border-r border-border last:border-r-0"
                    style={{ minWidth: 148 }}
                  >
                    {/* Today column tint */}
                    {isToday && (
                      <div className="pointer-events-none absolute inset-0 bg-[#FFFAF7]" />
                    )}

                    {/* Hour lines */}
                    {HOUR_MARKS.map(({ h, top }) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-border"
                        style={{ top }}
                      />
                    ))}

                    {/* Half-hour dashed lines */}
                    {HOUR_MARKS.slice(0, -1).map(({ h, top }) => (
                      <div
                        key={`${h}h`}
                        className="absolute left-0 right-0"
                        style={{ top: top + HOUR_PX / 2, borderTop: "1px dashed #F5EFE8" }}
                      />
                    ))}

                    {/* Off-hours dimming (outside clinic working hours) */}
                    {clinic === null ? (
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-[#F9F7F4]/80" />
                    ) : (
                      <>
                        {clinic.start > START_M && (
                          <div
                            className="pointer-events-none absolute left-0 right-0 z-[1] bg-[#F9F7F4]/80"
                            style={{ top: 0, height: topOf(clinic.start) }}
                          />
                        )}
                        {clinic.end < END_H * 60 && (
                          <div
                            className="pointer-events-none absolute left-0 right-0 z-[1] bg-[#F9F7F4]/80"
                            style={{ top: topOf(clinic.end), height: GRID_PX - topOf(clinic.end) }}
                          />
                        )}
                      </>
                    )}

                    {/* Appointment cards */}
                    {laid.map(({ appt, col, totalCols }) => {
                      const top    = topOf(toMins(appt.time))
                      const maxH   = GRID_PX - top - 1
                      const height = Math.min(Math.max(htOf(appt.duration) - 2, 22), maxH)
                      const color  = docColor(appt.doctorId)
                      const end    = addMins(appt.time, appt.duration)
                      const isMed  = height >= 34
                      const isTall = height >= 54

                      const leftPct  = (col / totalCols) * 100
                      const widthPct = (1 / totalCols) * 100

                      return (
                        <div
                          key={appt.id}
                          title={`${appt.patientName}\n${appt.time}–${end} · ${appt.service}\n${appt.bookingRef}`}
                          className="absolute z-[2] cursor-default overflow-hidden rounded-[5px] px-2 py-[3px] transition-[filter] hover:brightness-110"
                          style={{
                            top,
                            height,
                            left:      `calc(${leftPct}% + 2px)`,
                            width:     `calc(${widthPct}% - 4px)`,
                            background: color,
                            boxShadow:  `0 1px 3px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.15)`,
                          }}
                        >
                          <p className="truncate text-[10px] font-bold leading-tight text-white">
                            {appt.time}{isMed ? `–${end}` : ""}
                          </p>
                          {isMed && (
                            <p className="truncate text-[9px] leading-tight text-white/85">
                              {appt.patientName}
                            </p>
                          )}
                          {isTall && (
                            <p className="truncate text-[9px] leading-tight text-white/60">
                              {appt.service}
                            </p>
                          )}
                        </div>
                      )
                    })}

                    {/* Current time line – today column only */}
                    {isToday && showNow && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-[3] flex items-center"
                        style={{ top: nowTop }}
                      >
                        <div className="-ml-[3px] size-[7px] shrink-0 rounded-full bg-red-500 shadow-[0_0_0_2px_white]" />
                        <div className="h-px flex-1 bg-red-500 opacity-70" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function CalendarSkeleton() {
  return (
    <div className="animate-pulse select-none">
      {/* Day header skeleton */}
      <div className="flex border-b border-border">
        <div className="w-14 shrink-0 border-r border-border" />
        {WEEK_COLS.map(({ dow }) => (
          <div
            key={dow}
            className="flex flex-1 flex-col items-center gap-1.5 border-r border-border py-3 last:border-r-0"
            style={{ minWidth: 148 }}
          >
            <div className="h-2 w-7 rounded bg-[#EDE8E3]" />
            <div className="size-9 rounded-full bg-[#EDE8E3]" />
            <div className="h-3 w-3" />
          </div>
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="flex overflow-hidden" style={{ height: 400 }}>
        <div className="w-14 shrink-0 border-r border-border bg-secondary/30" />
        {WEEK_COLS.map(({ dow }, i) => (
          <div
            key={dow}
            className="relative flex-1 border-r border-border last:border-r-0 bg-white"
            style={{ minWidth: 148 }}
          >
            {/* Fake appointments */}
            {i % 3 !== 2 && (
              <div
                className="absolute mx-1.5 rounded-md bg-[#EDE8E3]"
                style={{ top: 60 + i * 44, left: 2, right: 2, height: 44 + (i % 2) * 20 }}
              />
            )}
            {i % 2 === 0 && (
              <div
                className="absolute mx-1.5 rounded-md bg-[#EDE8E3]"
                style={{ top: 190 + i * 20, left: 2, right: 2, height: 32 }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
