"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CalendarDays, Check, ChevronDown, Loader2, X, XCircle } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

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

type FormSnapshot = {
  serviceId:      string
  doctorId:       string
  branchId:       string
  patientName:    string
  patientSurname: string
  patientEmail:   string
  patientPhone:   string
  patientDOB:     string
  patientGender:  string
  notes:          string
  assignedTime:   string
  assignedDate:   string
}

type Props = {
  open:      boolean
  onClose:   () => void
  onCreated: () => void
  form:      FormSnapshot
  frequency: "DAILY" | "WEEKLY" | "FORTNIGHTLY" | "MONTHLY"
  sessions:  number
}

const STATUS_LABEL = {
  free:     { label: "Free",     color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  conflict: { label: "Conflict", color: "bg-amber-50 text-amber-700 ring-amber-200"      },
  full:     { label: "Day full", color: "bg-red-50 text-red-600 ring-red-200"            },
  off:      { label: "Day off",  color: "bg-zinc-100 text-zinc-500 ring-zinc-200"        },
  loading:  { label: "…",        color: "bg-zinc-100 text-zinc-400 ring-zinc-100"        },
}

const FREQ_LABEL = { DAILY: "Daily", WEEKLY: "Weekly", FORTNIGHTLY: "Every 2 weeks", MONTHLY: "Monthly" }

export default function RecurringPreviewModal({ open, onClose, onCreated, form, frequency, sessions }: Props) {
  const router = useRouter()
  const [rows,     setRows]     = useState<EditableRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [creating, setCreating] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const fetchPreview = useCallback(async () => {
    if (!form.doctorId || !form.assignedDate || !form.assignedTime || !form.serviceId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        doctorId:  form.doctorId,
        startDate: form.assignedDate,
        frequency,
        sessions:  String(sessions),
        time:      form.assignedTime,
        serviceId: form.serviceId,
      })
      const res  = await fetch(`/api/admin/schedule-preview?${params}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to load preview."); return }
      setRows((data.days as DayRow[]).map(d => ({
        date:      d.date,
        time:      d.suggestedTime ?? d.freeSlots[0] ?? form.assignedTime,
        freeSlots: d.freeSlots,
        status:    d.status,
      })))
    } catch { setError("Network error.") }
    finally   { setLoading(false) }
  }, [form.doctorId, form.assignedDate, form.assignedTime, form.serviceId, frequency, sessions])

  useEffect(() => { if (open) fetchPreview() }, [open, fetchPreview])

  async function refetchRow(index: number, newDate: string) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, date: newDate, status: "loading" } : r))
    const params = new URLSearchParams({
      doctorId:  form.doctorId,
      startDate: newDate,
      frequency: "DAILY",
      sessions:  "1",
      time:      rows[index]?.time ?? form.assignedTime,
      serviceId: form.serviceId,
    })
    try {
      const res  = await fetch(`/api/admin/schedule-preview?${params}`)
      const data = await res.json()
      if (!res.ok) return
      const day = data.days?.[0] as DayRow | undefined
      if (!day) return
      setRows(prev => prev.map((r, i) => i === index ? {
        ...r,
        date:      newDate,
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
    const payload = {
      serviceId:      form.serviceId,
      doctorId:       form.doctorId,
      branchId:       form.branchId || undefined,
      patientName:    form.patientName,
      patientSurname: form.patientSurname || undefined,
      patientEmail:   form.patientEmail,
      patientPhone:   form.patientPhone,
      patientDOB:     form.patientDOB     || undefined,
      patientGender:  form.patientGender  || undefined,
      notes:          form.notes          || undefined,
      sessions:       rows
        .filter(r => r.status !== "off" && r.time)
        .map(r => ({ date: r.date, time: r.time })),
    }
    const res  = await fetch("/api/admin/appointments/programme", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Failed to create programme."); return }
    router.refresh()
    onCreated()
  }

  const hasConflicts = rows.some(r => r.status === "conflict" || r.status === "full")
  const validRows    = rows.filter(r => r.status !== "off")

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">

        {/* Header */}
        <SheetHeader className="border-b border-[#F3EAE0] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-bold text-foreground">
                Schedule Preview
              </SheetTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {sessions} sessions · {FREQ_LABEL[frequency]} · {form.patientName}
              </p>
            </div>
            {hasConflicts && (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                <AlertTriangle className="size-3.5" />
                {rows.filter(r => r.status === "conflict" || r.status === "full").length} conflicts
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Building schedule…
            </div>
          ) : (
            <div className="divide-y divide-[#F3EAE0]">
              {rows.map((row, i) => {
                const s = STATUS_LABEL[row.status]
                return (
                  <div key={i} className={`flex items-center gap-3 px-5 py-3 ${row.status === "off" ? "opacity-50" : ""}`}>

                    {/* Day number */}
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-primary">
                      {i + 1}
                    </div>

                    {/* Date */}
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
                        <input
                          type="date"
                          value={row.date}
                          disabled={row.status === "loading"}
                          onChange={e => refetchRow(i, e.target.value)}
                          className="text-xs font-semibold text-foreground outline-none bg-transparent"
                        />
                      </div>
                    </div>

                    {/* Time selector */}
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
                            {row.freeSlots.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
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

                    {/* Status badge */}
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${s.color}`}>
                      {row.status === "loading" ? <Loader2 className="size-3 animate-spin" /> : s.label}
                    </span>

                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#F3EAE0] px-5 py-4 space-y-3">
          {hasConflicts && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
              <span>
                Conflicted days have been auto-moved to the next free slot.
                Adjust any row before confirming.
              </span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <XCircle className="size-3.5 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {validRows.length} of {rows.length} sessions will be created
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={onClose} disabled={creating}>
                <X className="size-4" /> Cancel
              </Button>
              <Button size="sm" className="rounded-xl" onClick={confirm} disabled={creating || loading || validRows.length === 0}>
                {creating
                  ? <><Loader2 className="size-4 animate-spin" /> Creating…</>
                  : <><Check className="size-4" /> Confirm & Create</>}
              </Button>
            </div>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  )
}
