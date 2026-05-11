"use client"

import { useState, useEffect, useRef, type MouseEvent } from "react"
import { AlertCircle, CalendarOff, CheckCircle2, ChevronLeft, ChevronRight, UserX } from "lucide-react"
import AppointmentDetailSheet from "@/components/admin/AppointmentDetailSheet"

// ── Grid constants ─────────────────────────────────────────────────────────────
const START_H  = 8
const END_H    = 20
const TOT_MINS = (END_H - START_H) * 60   // 720
const START_M  = START_H * 60
const ROW_H    = 62   // px — doctor row height
const BAR_H    = ROW_H
const BAR_TOP  = 0
const DOC_W    = 168  // px — sticky doctor info column
const MIN_TL   = 620  // px — minimum timeline width

// Hour guide lines (every 1h) and ruler labels (every 2h)
const HOUR_LINES  = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i)
const RULER_MARKS = Array.from({ length: 7 }, (_, i) => ({ h: START_H + i * 2, pct: i / 6 * 100 }))

// 8-colour doctor palette
const PALETTE = ["#2F7E91","#B83F45","#4F7F45","#B8792E","#7E5AA6","#2F756A","#B95664","#5869AA"]

const MONTHS_LONG  = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAYS_LONG    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]

// ── Helpers ────────────────────────────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, "0") }
function utcStr(d: Date)  { return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}` }
function todayUTC()       { const t = new Date(); return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())) }
function addDay(d: Date, n: number) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n)) }
function isToday(d: Date) { const t = new Date(); return d.getUTCFullYear()===t.getUTCFullYear() && d.getUTCMonth()===t.getUTCMonth() && d.getUTCDate()===t.getUTCDate() }
function toMins(t: string) { const [h,m]=t.split(":").map(Number); return h*60+m }
function addMins(t: string, d: number) { const e=toMins(t)+d; return `${pad2(Math.floor(e/60))}:${pad2(e%60)}` }

// % position along the timeline
function xPct(mins: number)     { return `${Math.max(0, Math.min(100, (mins - START_M) / TOT_MINS * 100)).toFixed(4)}%` }
function wPct(duration: number) { return `${(duration / TOT_MINS * 100).toFixed(4)}%` }

function dayLabel(d: Date) {
  return `${DAYS_LONG[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// ── Types ──────────────────────────────────────────────────────────────────────
type Doc   = { id: string; name: string; speciality: string; branchId: string | null; colorIndex: number }
type Appt  = { id: string; bookingRef: string; patientName: string; doctorId: string; date: string; time: string; duration: number; service: string; status: string }
type WH    = { doctorId: string; dayOfWeek: number; startTime: string; endTime: string }
type Leave = { doctorId: string; startDate: string; endDate: string; reason: string | null }
type Data  = { doctors: Doc[]; appointments: Appt[]; workingHours: WH[]; leaves: Leave[]; branches: { id: string; name: string }[] }
type SelectedAppt = Appt & {
  doctorName: string
  doctorColor: string
  end: string
  origin: { left: number; top: number; width: number; height: number }
}

const STATUS_META: Record<string, { label: string; accent: string; icon: React.ElementType; blockClass: string }> = {
  COMPLETED: {
    label: "Completed",
    accent: "#2F8F72",
    icon: CheckCircle2,
    blockClass: "saturate-[0.82] brightness-[1.04]",
  },
  NO_SHOW: {
    label: "No show",
    accent: "#D97706",
    icon: UserX,
    blockClass: "saturate-[0.72] brightness-[0.94]",
  },
}

function statusMeta(status: string) {
  return STATUS_META[status] ?? null
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DayCalendar({ isTenantAdmin }: { isTenantAdmin: boolean }) {
  const [date,    setDate]    = useState(todayUTC)
  const [branch,  setBranch]  = useState("all")
  const [data,    setData]    = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState(false)
  const [now,     setNow]     = useState(() => new Date())
  const [selectedAppt, setSelectedAppt] = useState<SelectedAppt | null>(null)
  const [expanded,     setExpanded]     = useState(false)
  const [detailId,     setDetailId]     = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Fetch on date change — cancel stale requests
  useEffect(() => {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    setLoading(true)
    setFetchErr(false)

    const ds = utcStr(date)
    fetch(`/api/schedule?start=${ds}&end=${ds}`, { signal: abort.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
      .then(d => { setData(d); setFetchErr(false) })
      .catch(err => { if (err?.name !== "AbortError") setFetchErr(true) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })

    return () => abort.abort()
  }, [date])

  useEffect(() => {
    if (!selectedAppt) return
    const frame = requestAnimationFrame(() => setExpanded(true))
    return () => cancelAnimationFrame(frame)
  }, [selectedAppt])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const today    = isToday(date)
  const nowMins  = now.getHours() * 60 + now.getMinutes()
  const showNow  = today && nowMins >= START_M && nowMins <= END_H * 60
  const nowPct   = xPct(nowMins)
  const nowLabel = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
  const dow      = date.getUTCDay()

  const allDocs  = data?.doctors ?? []
  const visDocs  = allDocs.filter(d => branch === "all" || d.branchId === branch)
  const visIds   = new Set(visDocs.map(d => d.id))
  const appts    = (data?.appointments ?? []).filter(a => visIds.has(a.doctorId))
  const wh       = data?.workingHours ?? []
  const leaves   = data?.leaves ?? []
  const branches = data?.branches ?? []

  // Doctors on leave for the selected date
  const ds = utcStr(date)
  const onLeaveIds = new Set(
    leaves
      .filter(l => l.startDate <= ds && l.endDate >= ds)
      .map(l => l.doctorId)
  )
  function leaveReason(docId: string) {
    const l = leaves.find(l => l.doctorId === docId && l.startDate <= ds && l.endDate >= ds)
    return l?.reason ?? null
  }

  const totalAppts = appts.length
  const completedTotal = appts.filter((appt) => appt.status === "COMPLETED").length
  const noShowTotal = appts.filter((appt) => appt.status === "NO_SHOW").length

  const apptsByDoc = new Map<string, Appt[]>()
  for (const a of appts) { const arr = apptsByDoc.get(a.doctorId) ?? []; arr.push(a); apptsByDoc.set(a.doctorId, arr) }

  function docWH(id: string) { return wh.find(w => w.doctorId === id && w.dayOfWeek === dow) ?? null }
  function color(idx: number) { return PALETTE[idx % PALETTE.length] }
  function moveDate(days: number) {
    setLoading(true)
    setDate(d => addDay(d, days))
  }
  function jumpToday() {
    setLoading(true)
    setDate(todayUTC())
  }
  function openAppointment(
    appt: Appt,
    doc: Doc,
    doctorColor: string,
    end: string,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect()
    setExpanded(false)
    setSelectedAppt({
      ...appt,
      doctorName: doc.name,
      doctorColor,
      end,
      origin: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    })
  }
  function closeAppointment() {
    setExpanded(false)
    window.setTimeout(() => setSelectedAppt(null), 160)
  }
  function updateAppointmentStatus(id: string, status: string) {
    setData(prev => prev
      ? {
          ...prev,
          appointments: prev.appointments.map(appt => appt.id === id ? { ...appt, status } : appt),
        }
      : prev
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">

      {/* ── Navigation bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-3 py-2">

        <div className="flex min-w-0 items-center gap-1">
          {/* Prev */}
          <button
            onClick={() => moveDate(-1)}
            className="flex size-7 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-secondary"
            title="Previous day"
          >
            <ChevronLeft className="size-3.5" />
          </button>

          {/* Date label */}
          <span className="w-52 truncate px-1 text-center text-xs font-bold text-foreground sm:w-60">
            {dayLabel(date)}
          </span>

          {/* Next */}
          <button
            onClick={() => moveDate(1)}
            className="flex size-7 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-secondary"
            title="Next day"
          >
            <ChevronRight className="size-3.5" />
          </button>

          {/* Today jump */}
          {!today && (
            <button
              onClick={jumpToday}
              className="ml-1 rounded-md border border-primary/25 bg-white px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              Today
            </button>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          <span className="hidden rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-foreground ring-1 ring-[#F3EAE0] sm:inline">
            {loading ? "…" : `${totalAppts} appt${totalAppts !== 1 ? "s" : ""}`}
          </span>
          {!loading && completedTotal > 0 && (
            <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 sm:flex">
              <CheckCircle2 className="size-3" />
              {completedTotal}
            </span>
          )}
          {!loading && noShowTotal > 0 && (
            <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 sm:flex">
              <UserX className="size-3" />
              {noShowTotal}
            </span>
          )}

          {showNow && (
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
              {nowLabel}
            </span>
          )}

          {isTenantAdmin && branches.length > 1 && (
            <select
              value={branch}
              onChange={e => setBranch(e.target.value)}
              className="h-7 rounded-md border border-border bg-white px-2 text-[11px] font-medium text-foreground outline-none focus:border-primary/40"
            >
              <option value="all">All branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      {loading ? <Skeleton /> : fetchErr ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <AlertCircle className="size-6 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Failed to load schedule</p>
          <button
            onClick={() => { setDate(d => addDay(d, 0)) }} // re-trigger effect
            className="text-xs font-semibold text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : visDocs.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No active doctors for this day.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: DOC_W + MIN_TL }}>

            {/* ── Time ruler (sticky top) ───────────────────────────────── */}
            <div
              className="sticky top-0 z-20 flex border-b border-border bg-secondary/30 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]"
              style={{ height: 30 }}
            >
              {/* Corner — sticky both top and left */}
              <div
                className="sticky left-0 z-30 shrink-0 border-r border-border bg-secondary/30"
                style={{ width: DOC_W }}
              />

              {/* Ruler body */}
              <div className="relative flex-1">

                {/* Hour tick lines */}
                {HOUR_LINES.map(h => h !== START_H && (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0"
                    style={{
                      left:        xPct((h - START_H) * 60 + START_M),
                      borderLeft:  h % 2 === 0 ? "1px solid #EDEAE6" : "1px dashed #F3EFE9",
                    }}
                  />
                ))}

                {/* Hour labels */}
                {RULER_MARKS.map(({ h, pct }, i) => (
                  <div
                    key={h}
                    className="absolute flex items-center"
                    style={{
                      left:      `${pct}%`,
                      top:       0,
                      bottom:    0,
                      transform: i === 0 ? "none" : i === 6 ? "translateX(-100%)" : "translateX(-50%)",
                    }}
                  >
                    <span className="pl-1 text-[9px] font-semibold tabular-nums text-muted-foreground/55">
                      {pad2(h)}:00
                    </span>
                  </div>
                ))}

                {/* Current time pill + drop line in ruler */}
                {showNow && (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 z-10 flex flex-col items-center"
                    style={{ left: nowPct, transform: "translateX(-50%)" }}
                  >
                    <div className="mt-1 rounded bg-red-500 px-1.5 py-px text-[9px] font-bold leading-tight text-white shadow-sm">
                      {nowLabel}
                    </div>
                    <div className="w-px flex-1 bg-red-400 opacity-60" />
                  </div>
                )}
              </div>
            </div>

            {/* ── Doctor rows ───────────────────────────────────────────── */}
            <div className="divide-y divide-[#F3EAE0]">
              {visDocs.map(doc => {
                const c        = color(doc.colorIndex)
                const entry    = docWH(doc.id)
                const docAppts = apptsByDoc.get(doc.id) ?? []
                const onLeave  = onLeaveIds.has(doc.id)
                const isOff    = entry === null && !onLeave
                const wStart   = entry ? toMins(entry.startTime) : null
                const wEnd     = entry ? toMins(entry.endTime)   : null

                return (
                  <div key={doc.id} className="flex" style={{ height: ROW_H }}>

                    {/* ── Doctor cell (sticky left) ──────────────────────── */}
                    <div
                      className="sticky left-0 z-10 flex shrink-0 items-center gap-2.5 border-r border-border bg-white px-3"
                      style={{ width: DOC_W }}
                    >
                      {/* Avatar */}
                      <div
                        className="flex size-7 shrink-0 items-center justify-center rounded-[3px] text-[10px] font-black text-white"
                        style={{ background: c }}
                      >
                        {doc.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold leading-tight text-foreground">{doc.name}</p>
                        <p className="truncate text-[10px] leading-tight text-muted-foreground">
                          {onLeave
                            ? <span className="flex items-center gap-1 text-rose-500 font-medium"><CalendarOff className="size-2.5" />{leaveReason(doc.id) ?? "On leave"}</span>
                            : isOff
                            ? <span className="text-amber-500 font-medium">Off today</span>
                            : `${entry!.startTime}–${entry!.endTime}`}
                        </p>
                      </div>

                      {/* Appointment badge */}
                      {docAppts.length > 0 && (
                        <span
                          className="flex size-5 shrink-0 items-center justify-center rounded-[3px] text-[10px] font-bold leading-none text-white"
                          style={{ background: c }}
                        >
                          {docAppts.length}
                        </span>
                      )}
                    </div>

                    {/* ── Timeline ──────────────────────────────────────── */}
                    <div className="relative flex-1 overflow-hidden">

                      {/* Off-hours / on-leave dimming */}
                      {(isOff || onLeave) ? (
                        <div className={`absolute inset-0 ${onLeave ? "bg-rose-50/60" : "bg-[#F9F7F4]"}`} />
                      ) : (
                        <>
                          {wStart !== null && wStart > START_M && (
                            <div
                              className="absolute top-0 bottom-0 bg-[#F9F7F4]"
                              style={{ left: 0, width: xPct(wStart) }}
                            />
                          )}
                          {wEnd !== null && wEnd < END_H * 60 && (
                            <div
                              className="absolute top-0 bottom-0 bg-[#F9F7F4]"
                              style={{ left: xPct(wEnd), right: 0 }}
                            />
                          )}
                        </>
                      )}

                      {/* Hour guide lines */}
                      {HOUR_LINES.map(h => h !== START_H && (
                        <div
                          key={h}
                          className="absolute top-0 bottom-0 pointer-events-none"
                          style={{
                            left:       xPct((h - START_H) * 60 + START_M),
                            borderLeft: h % 2 === 0 ? "1px solid #EDEAE6" : "1px dashed #F3EFE9",
                          }}
                        />
                      ))}

                      {/* Day-off / on-leave label */}
                      {(isOff || onLeave) && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5">
                          {onLeave
                            ? <><CalendarOff className="size-3 text-rose-400/50" /><span className="text-[10px] font-semibold tracking-wider text-rose-400/50">On leave</span></>
                            : <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/30">Day off</span>
                          }
                        </div>
                      )}

                      {/* Appointment blocks */}
                      {docAppts.map(appt => {
                        const s    = toMins(appt.time)
                        const end  = addMins(appt.time, appt.duration)
                        const wide = appt.duration >= 50
                        const med  = appt.duration >= 20

                        return (
                          <button
                            type="button"
                            key={appt.id}
                            onClick={(event) => openAppointment(appt, doc, c, end, event)}
                            title={`${appt.patientName}\n${appt.time}–${end} · ${appt.service}\n${appt.bookingRef}`}
                            className="absolute z-2 block cursor-pointer overflow-hidden rounded-none border border-black/10 text-left transition-[filter] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                            style={{
                              left:      xPct(s),
                              width:     wPct(appt.duration),
                              top:       BAR_TOP,
                              height:    BAR_H,
                              minWidth:  "42px",
                              background: c,
                              boxShadow: "0 1px 2px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.16)",
                            }}
                          >
                            <span className="flex h-full min-w-0 flex-col justify-center px-2">
                              {med && (
                                <span className="truncate text-[10px] font-bold leading-tight text-white">
                                  {appt.time}{wide ? ` - ${end}` : ""}
                                </span>
                              )}
                              {wide && (
                                <span className="truncate text-[10px] font-semibold leading-tight text-white/95">
                                  {appt.patientName}
                                </span>
                              )}
                              {appt.duration >= 75 && (
                                <span className="truncate text-[9px] leading-tight text-white/85">
                                  {appt.service}
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      })}

                      {/* Current time line */}
                      {showNow && (
                        <div
                          className="pointer-events-none absolute top-0 bottom-0 z-3 w-px bg-red-500 opacity-40"
                          style={{ left: nowPct }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </div>
      )}
      {selectedAppt && (
        <ExpandedAppointmentCard
          appointment={selectedAppt}
          expanded={expanded}
          onClose={closeAppointment}
          onOpen={(id) => { closeAppointment(); setTimeout(() => setDetailId(id), 180) }}
        />
      )}

      <AppointmentDetailSheet
        appointmentId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  )
}

function ExpandedAppointmentCard({
  appointment,
  expanded,
  onClose,
  onOpen,
}: {
  appointment: SelectedAppt
  expanded: boolean
  onClose: () => void
  onOpen: (id: string) => void
}) {
  const width = Math.min(380, window.innerWidth - 32)
  const height = 272
  const left = Math.max(16, (window.innerWidth - width) / 2)
  const top = Math.max(24, (window.innerHeight - height) / 2)
  const scaleX = appointment.origin.width / width
  const scaleY = appointment.origin.height / height
  const transform = expanded
    ? "translate3d(0, 0, 0) scale(1)"
    : `translate3d(${appointment.origin.left - left}px, ${appointment.origin.top - top}px, 0) scale(${scaleX}, ${scaleY})`

  return (
    <>
      <button
        type="button"
        aria-label="Close appointment details"
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] transition-opacity duration-150"
        style={{ opacity: expanded ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${appointment.patientName} appointment details`}
        className="fixed z-50 overflow-hidden rounded-lg border border-white/25 text-white shadow-lg transition-transform duration-200 ease-out"
        style={{
          left,
          top,
          width,
          minHeight: height,
          background: `linear-gradient(0deg, ${appointment.doctorColor}CC, ${appointment.doctorColor}CC), #ffffff`,
          transform,
          transformOrigin: "top left",
        }}
      >
        <div className="px-5 pb-3 pt-4">
          <p className="truncate text-lg font-bold text-white">{appointment.patientName}</p>
          <p className="mt-1 text-xs font-semibold text-white/75">
            {appointment.time} - {appointment.end} · {appointment.bookingRef}
          </p>
        </div>
        <div className="mx-4 space-y-2 rounded-md bg-white/16 px-4 py-4 ring-1 ring-white/18">
          <DetailRow label="Service" value={appointment.service} />
          <DetailRow label="Doctor" value={appointment.doctorName} />
          <DetailRow label="Duration" value={`${appointment.duration} min`} />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={() => onOpen(appointment.id)}
            className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-xs font-bold transition-colors hover:bg-white/90"
            style={{ color: appointment.doctorColor }}
          >
            Open appointment
          </button>
          <button
            type="button"
            className="h-8 px-2 text-xs font-bold text-white/75 transition-colors hover:text-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 text-sm">
      <span className="text-xs font-semibold text-white/60">{label}</span>
      <span className="min-w-0 wrap-break-word font-semibold text-white">{value}</span>
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex border-b border-border" style={{ height: 30 }}>
        <div style={{ width: DOC_W }} className="shrink-0 border-r border-border bg-secondary/30" />
        <div className="flex-1 bg-secondary/30" />
      </div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex border-b border-border" style={{ height: ROW_H }}>
          <div style={{ width: DOC_W }} className="flex shrink-0 items-center gap-2.5 border-r border-border px-3">
            <div className="size-7 rounded-[3px] bg-[#EDE8E3]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-20 rounded bg-[#EDE8E3]" />
              <div className="h-1.5 w-14 rounded bg-[#EDE8E3]" />
            </div>
          </div>
          <div className="relative flex-1">
            {i % 2 !== 0 && (
              <div
                className="absolute rounded bg-[#EDE8E3]"
                style={{ left: `${8 + i * 13}%`, width: `${12 + i * 4}%`, top: BAR_TOP, height: BAR_H }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
