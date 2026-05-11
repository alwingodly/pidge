"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CalendarOff, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type Leave = {
  id:        string
  startDate: string
  endDate:   string
  period:    string   // FULL | MORNING | AFTERNOON
  reason:    string | null
}

type Period = "FULL" | "MORNING" | "AFTERNOON"

const REASONS = ["Holiday", "Sick leave", "Training", "Personal", "Conference", "Other"]

const PERIOD_CONFIG: Record<Period, { label: string; short: string; color: string }> = {
  FULL:      { label: "Full day",   short: "Full",  color: "bg-slate-100 text-slate-600 ring-slate-200" },
  MORNING:   { label: "Morning",    short: "AM",    color: "bg-amber-50 text-amber-700 ring-amber-200"  },
  AFTERNOON: { label: "Afternoon",  short: "PM",    color: "bg-blue-50 text-blue-700 ring-blue-200"     },
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  })
}

function fmtDateShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  })
}

function isSingleDay(l: Leave) { return l.startDate === l.endDate }

export default function DoctorLeaveManager({
  doctorId, doctorName, initialLeaves,
}: {
  doctorId:      string
  doctorName:    string
  initialLeaves: Leave[]
}) {
  const router = useRouter()
  const today  = new Date().toISOString().slice(0, 10)

  const [leaves,     setLeaves]     = useState<Leave[]>(initialLeaves)
  const [formOpen,   setFormOpen]   = useState(false)
  const [startDate,  setStartDate]  = useState(today)
  const [endDate,    setEndDate]    = useState(today)
  const [period,     setPeriod]     = useState<Period>("FULL")
  const [reason,     setReason]     = useState("")
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [affected,   setAffected]   = useState<number | null>(null)

  const isRange      = startDate !== endDate
  const showPeriod   = !isRange  // half-day only makes sense for single days

  async function handleAdd() {
    if (!startDate) return
    setSaving(true); setError(null); setAffected(null)
    const res  = await fetch("/api/doctor-leave", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        doctorId,
        startDate,
        endDate:  endDate || startDate,
        period:   isRange ? "FULL" : period,
        reason:   reason || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setLeaves(prev => [
      ...prev,
      { ...data.data, startDate: data.data.startDate.slice(0, 10), endDate: data.data.endDate.slice(0, 10) },
    ].sort((a, b) => a.startDate.localeCompare(b.startDate)))
    setAffected(data.affectedAppointments)
    setFormOpen(false)
    setStartDate(today); setEndDate(today); setPeriod("FULL"); setReason("")
    setSaving(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/doctor-leave/${id}`, { method: "DELETE" })
    if (res.ok) { setLeaves(prev => prev.filter(l => l.id !== id)); setAffected(null) }
    setDeletingId(null)
    router.refresh()
  }

  const upcoming = leaves.filter(l => l.endDate >= today)
  const past     = leaves.filter(l => l.endDate <  today)

  return (
    <div className="space-y-4">

      {/* Affected warning */}
      {affected !== null && affected > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
          <p className="flex-1 text-xs text-amber-800">
            <span className="font-semibold">{affected} appointment{affected !== 1 ? "s" : ""}</span>{" "}
            fall during this period — review and reassign.
          </p>
          <button onClick={() => setAffected(null)} className="text-amber-500 hover:text-amber-700">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Add form ── */}
      {formOpen ? (
        <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-4">

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</p>
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value)
                  if (e.target.value > endDate) setEndDate(e.target.value)
                }}
                className="h-9 w-full rounded-lg border border-border bg-white px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To</p>
              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-white px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Period — only for single day */}
          {showPeriod && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["FULL", "MORNING", "AFTERNOON"] as Period[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`rounded-lg border py-2 text-xs font-semibold transition-all ${
                      period === p
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <span className="block text-[10px] opacity-70">
                      {p === "FULL" ? "All day" : p === "MORNING" ? "09:00–12:00" : "12:00–18:00"}
                    </span>
                    {PERIOD_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reason chips */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason <span className="font-normal normal-case">(optional)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(prev => prev === r ? "" : r)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    reason === r
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" className="h-8 rounded-lg px-4 text-xs" disabled={saving} onClick={handleAdd}>
              {saving ? "Saving…" : "Save leave"}
            </Button>
            <Button
              size="sm" variant="outline"
              className="h-8 rounded-lg px-3 text-xs"
              onClick={() => { setFormOpen(false); setError(null) }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setFormOpen(true); setAffected(null); setError(null) }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="size-3.5" /> Add leave period
        </button>
      )}

      {/* ── Upcoming leave list ── */}
      {upcoming.length === 0 && !formOpen && (
        <div className="flex flex-col items-center gap-2 py-10">
          <CalendarOff className="size-6 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">No upcoming leave for {doctorName}.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upcoming</p>
          <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">
            {upcoming.map(l => (
              <LeaveRow key={l.id} leave={l} onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </div>
        </div>
      )}

      {/* ── Past ── */}
      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer select-none text-[11px] font-medium text-muted-foreground hover:text-foreground list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">›</span>
            {past.length} past record{past.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-2 overflow-hidden rounded-xl border border-border divide-y divide-border opacity-50">
            {past.map(l => (
              <LeaveRow key={l.id} leave={l} onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </div>
        </details>
      )}

    </div>
  )
}

function LeaveRow({ leave: l, onDelete, deletingId }: {
  leave:      Leave
  onDelete:   (id: string) => void
  deletingId: string | null
}) {
  const p      = (l.period ?? "FULL") as Period
  const cfg    = PERIOD_CONFIG[p] ?? PERIOD_CONFIG.FULL
  const single = isSingleDay(l)

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-3">
      {/* Date block */}
      <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary py-2 text-center">
        {single ? (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {new Date(l.startDate + "T00:00:00").toLocaleDateString("en-GB", { month: "short" })}
            </span>
            <span className="text-xl font-bold leading-none text-foreground">
              {new Date(l.startDate + "T00:00:00").getDate()}
            </span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-bold text-muted-foreground">{fmtDateShort(l.startDate)}</span>
            <span className="text-[10px] text-muted-foreground">–</span>
            <span className="text-[10px] font-bold text-muted-foreground">{fmtDateShort(l.endDate)}</span>
          </>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${cfg.color}`}>
            {cfg.short}
          </span>
          {l.reason && (
            <span className="text-xs text-muted-foreground">{l.reason}</span>
          )}
        </div>
        {!single && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {fmtDate(l.startDate)} – {fmtDate(l.endDate)}
          </p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(l.id)}
        disabled={deletingId === l.id}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  )
}
