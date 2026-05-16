"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle, CalendarDays, Check, ChevronDown,
  Loader2, RefreshCw, X, XCircle,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"

type DayRow = {
  index:         number
  date:          string
  status:        "free" | "conflict" | "full" | "off"
  suggestedTime: string | null
  freeSlots:     string[]
}

type EditableRow = {
  date:      string
  time:      string
  freeSlots: string[]
  status:    "free" | "conflict" | "full" | "off" | "loading"
}

type AppointmentSnap = {
  id:           string
  doctorId:     string
  serviceId:    string
  assignedDate: string   // YYYY-MM-DD
  assignedTime: string   // HH:MM
  serviceName:  string
  doctorName:   string
}

type Props = {
  open:        boolean
  onClose:     () => void
  onExpanded:  () => void
  appointment: AppointmentSnap
}

const FREQ_OPTIONS = [
  { value: "DAILY",       label: "Daily (consecutive working days)" },
  { value: "WEEKLY",      label: "Weekly"                           },
  { value: "FORTNIGHTLY", label: "Every 2 weeks"                    },
  { value: "MONTHLY",     label: "Monthly"                          },
] as const

type Freq = typeof FREQ_OPTIONS[number]["value"]

const STATUS_STYLE = {
  free:     "bg-emerald-50 text-emerald-700 ring-emerald-200",
  conflict: "bg-amber-50 text-amber-700 ring-amber-200",
  full:     "bg-red-50 text-red-600 ring-red-200",
  off:      "bg-zinc-100 text-zinc-400 ring-zinc-200",
  loading:  "bg-zinc-100 text-zinc-400 ring-zinc-100",
}
const STATUS_LABEL = { free: "Free", conflict: "Conflict", full: "Day full", off: "Day off", loading: "…" }

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr.slice(0, 10) + "T00:00:00.000Z")
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function ExpandToProgrammeModal({ open, onClose, onExpanded, appointment }: Props) {
  const router = useRouter()

  const [frequency,   setFrequency]   = useState<Freq>("DAILY")
  const [extraCount,  setExtraCount]  = useState(6)   // additional sessions (not counting session 1)
  const [rows,        setRows]        = useState<EditableRow[]>([])
  const [previewed,   setPreviewed]   = useState(false)
  const [loadingPrev, setLoadingPrev] = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const startDate = frequency === "DAILY"
    ? addDays(appointment.assignedDate, 1)   // next calendar day — preview skips off/leave days
    : appointment.assignedDate                // same base date, interval handles spacing

  const fetchPreview = useCallback(async () => {
    setLoadingPrev(true); setError(null); setPreviewed(false)
    try {
      const params = new URLSearchParams({
        doctorId:  appointment.doctorId,
        startDate: frequency === "DAILY" ? addDays(appointment.assignedDate, 1) : appointment.assignedDate,
        frequency,
        sessions:  String(extraCount),
        time:      appointment.assignedTime,
        serviceId: appointment.serviceId,
      })
      // For non-daily, skip session 0 (original) by offset
      if (frequency !== "DAILY") params.set("skipFirst", "1")

      const res  = await fetch(`/api/admin/schedule-preview?${params}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to load preview."); return }

      const days = data.days as DayRow[]
      setRows(days.map(d => ({
        date:      d.date,
        time:      d.suggestedTime ?? d.freeSlots[0] ?? appointment.assignedTime,
        freeSlots: d.freeSlots,
        status:    d.status,
      })))
      setPreviewed(true)
    } catch { setError("Network error.") }
    finally   { setLoadingPrev(false) }
  }, [appointment, frequency, extraCount])

  async function refetchRow(index: number, newDate: string) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, date: newDate, status: "loading" } : r))
    const params = new URLSearchParams({
      doctorId:  appointment.doctorId,
      startDate: newDate,
      frequency: "DAILY",
      sessions:  "1",
      time:      rows[index]?.time ?? appointment.assignedTime,
      serviceId: appointment.serviceId,
    })
    try {
      const res  = await fetch(`/api/admin/schedule-preview?${params}`)
      const data = await res.json()
      const day  = data.days?.[0] as DayRow | undefined
      if (!day) return
      setRows(prev => prev.map((r, i) => i === index ? {
        ...r, date: day.date,
        time:      day.suggestedTime ?? day.freeSlots[0] ?? r.time,
        freeSlots: day.freeSlots,
        status:    day.status,
      } : r))
    } catch { /* ignore */ }
  }

  function setTime(index: number, time: string) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, time } : r))
  }

  async function confirm() {
    setCreating(true); setError(null)
    const validSessions = rows
      .filter(r => r.status !== "off" && r.time)
      .map(r => ({ date: r.date, time: r.time }))

    const res  = await fetch(`/api/appointments/${appointment.id}/expand`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ sessions: validSessions }),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Failed to expand."); return }
    router.refresh()
    onExpanded()
  }

  const hasConflicts = rows.some(r => r.status === "conflict" || r.status === "full")
  const validRows    = rows.filter(r => r.status !== "off")

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">

        {/* Header */}
        <SheetHeader className="border-b border-[#F3EAE0] px-5 py-4">
          <SheetTitle className="text-base font-bold text-foreground">
            Expand to programme
          </SheetTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Session 1 is already confirmed on {format(new Date(appointment.assignedDate + "T00:00:00"), "d MMM yyyy")} at {appointment.assignedTime}.
            Add more sessions below.
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">

          {/* Configuration */}
          <div className="border-b border-[#F3EAE0] px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Repeat pattern</Label>
                <select
                  value={frequency}
                  onChange={e => { setFrequency(e.target.value as Freq); setPreviewed(false) }}
                  className="h-9 w-full rounded-xl border border-border bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {FREQ_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Additional sessions <span className="text-muted-foreground font-normal">(excl. session 1)</span>
                </Label>
                <input
                  type="number" min={1} max={60}
                  value={extraCount}
                  onChange={e => { setExtraCount(Math.min(60, Math.max(1, parseInt(e.target.value) || 1))); setPreviewed(false) }}
                  className="h-9 w-full rounded-xl border border-border bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={fetchPreview}
              disabled={loadingPrev}
            >
              {loadingPrev
                ? <><Loader2 className="size-4 animate-spin" /> Loading preview…</>
                : <><RefreshCw className="size-4" /> {previewed ? "Refresh preview" : "Preview schedule"}</>}
            </Button>
          </div>

          {/* Session 1 — locked */}
          <div className="border-b border-[#F3EAE0] bg-secondary/30 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">1</div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {format(new Date(appointment.assignedDate + "T00:00:00"), "d MMM yyyy")} · {appointment.assignedTime}
                </p>
                <p className="text-[11px] text-muted-foreground">{appointment.serviceName} · {appointment.doctorName}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Confirmed
              </span>
            </div>
          </div>

          {/* Additional sessions preview */}
          {previewed && (
            <div className="divide-y divide-[#F3EAE0]">
              {rows.map((row, i) => (
                <div key={i} className={`flex items-center gap-3 px-5 py-3 ${row.status === "off" ? "opacity-40" : ""}`}>
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-primary">
                    {i + 2}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      <input
                        type="date"
                        value={row.date}
                        disabled={row.status === "loading"}
                        onChange={e => refetchRow(i, e.target.value)}
                        className="text-xs font-semibold text-foreground outline-none bg-transparent"
                      />
                    </div>
                  </div>
                  <div className="shrink-0">
                    {row.status === "off" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : row.freeSlots.length > 0 ? (
                      <div className="flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1">
                        <select
                          value={row.time}
                          onChange={e => setTime(i, e.target.value)}
                          className="text-xs font-semibold text-foreground outline-none bg-transparent"
                        >
                          {row.freeSlots.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </div>
                    ) : (
                      <input
                        type="time"
                        value={row.time}
                        onChange={e => setTime(i, e.target.value)}
                        className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground outline-none"
                      />
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_STYLE[row.status]}`}>
                    {row.status === "loading" ? <Loader2 className="size-3 animate-spin" /> : STATUS_LABEL[row.status]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {previewed && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <CalendarDays className="mb-2 size-8 text-amber-300" />
              <p className="text-sm font-semibold text-foreground">No sessions generated</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No working days were found for <strong>{appointment.doctorName}</strong>.
                Make sure their schedule is set up in the Doctors page, then try again.
              </p>
            </div>
          )}

          {!previewed && !loadingPrev && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="mb-2 size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Click "Preview schedule" to see available slots</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#F3EAE0] px-5 py-4 space-y-3">
          {hasConflicts && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              Conflicted days auto-moved to next free slot. Adjust before confirming.
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <XCircle className="size-3.5 shrink-0" />{error}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {previewed ? `${1 + validRows.length} total sessions` : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={onClose} disabled={creating}>
                <X className="size-4" /> Cancel
              </Button>
              <Button
                size="sm" className="rounded-xl"
                onClick={confirm}
                disabled={creating || !previewed || validRows.length === 0}
              >
                {creating
                  ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                  : <><Check className="size-4" /> Confirm programme</>}
              </Button>
            </div>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  )
}
