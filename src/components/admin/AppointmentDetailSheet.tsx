"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { formatDate, formatTime } from "@/lib/utils"
import {
  CalendarDays, Clock, Stethoscope, UserRound,
  FileText, Check, X, UserX, Loader2, Mail, Phone, Hash,
  Building2,
} from "lucide-react"

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { ring: string; bg: string; text: string }> = {
  PENDING:   { ring: "ring-amber-200",   bg: "bg-amber-50",   text: "text-amber-700"   },
  APPROVED:  { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700" },
  CANCELLED: { ring: "ring-red-200",     bg: "bg-red-50",     text: "text-red-600"     },
  COMPLETED: { ring: "ring-[#C5DFE4]",  bg: "bg-[#EAF3F5]",  text: "text-[#3A8A97]"  },
  NO_SHOW:   { ring: "ring-orange-200",  bg: "bg-orange-50",  text: "text-orange-600"  },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { ring: "ring-border", bg: "bg-muted", text: "text-muted-foreground" }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      {status.replace("_", " ")}
    </span>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────
type Appointment = {
  id: string; bookingRef: string; status: string
  patientName: string; patientSurname?: string | null
  patientEmail: string; patientPhone: string
  patientDOB?: string | null; patientGender?: string | null
  notes?: string | null; attachmentName?: string | null
  assignedDate?: string | null; assignedTime?: string | null
  preferredDate?: string | null
  slot?: { date: string; startTime: string } | null
  service: { name: string; durationMins: number }
  doctor?: { name: string; speciality: string } | null
  branch?: { name: string } | null
  statusHistory?: {
    id: string
    fromStatus?: string | null
    toStatus: string
    actorName?: string | null
    actorRole?: string | null
    note?: string | null
    createdAt: string
  }[]
  patientHistoryEnabled?: boolean
  patientHistory?: {
    id: string
    bookingRef: string
    status: string
    appointmentType?: string | null
    preferredDate?: string | null
    assignedDate?: string | null
    assignedTime?: string | null
    createdAt: string
    service: { name: string }
    doctor?: { name: string } | null
  }[]
}

type Props = {
  appointmentId: string | null
  onClose: () => void
  onStatusChange?: (id: string, status: string) => void
}

// ── Action config ──────────────────────────────────────────────────────────────
type Status = "APPROVED" | "CANCELLED" | "COMPLETED" | "NO_SHOW"
const ACTIONS: { status: Status; label: string; icon: React.ElementType; style: string; allowed: string[] }[] = [
  { status: "APPROVED",  label: "Approve",        icon: Check,  style: "bg-emerald-600 hover:bg-emerald-700 text-white",                         allowed: ["PENDING"]            },
  { status: "COMPLETED", label: "Mark completed",  icon: Check,  style: "bg-[#7EACB5] hover:bg-[#6a9aa3] text-white",                            allowed: ["APPROVED"]           },
  { status: "NO_SHOW",   label: "No show",         icon: UserX,  style: "bg-orange-500 hover:bg-orange-600 text-white",                           allowed: ["APPROVED"]           },
  { status: "CANCELLED", label: "Cancel",          icon: X,      style: "border border-red-200 bg-white text-red-600 hover:bg-red-50",            allowed: ["PENDING","APPROVED"] },
]

// ── Sub-components ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="border-b border-[#F3EAE0] bg-secondary/30 px-4 py-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{title}</p>
      </div>
      <div className="divide-y divide-[#F3EAE0]">{children}</div>
    </div>
  )
}

function Row({
  icon: Icon, label, value, mono, dim, multiline,
}: {
  icon: React.ElementType; label: string; value: string
  mono?: boolean; dim?: boolean; multiline?: boolean
}) {
  return (
    <div className={`flex gap-3 px-4 py-2.5 ${multiline ? "flex-col" : "items-start"}`}>
      <div className="mt-0.5 flex shrink-0 items-center gap-2 text-muted-foreground" style={{ minWidth: 120 }}>
        <Icon className="size-3.5 shrink-0" />
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-sm font-medium leading-snug ${dim ? "text-muted-foreground" : "text-foreground"} ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AppointmentDetailSheet({ appointmentId, onClose, onStatusChange }: Props) {
  const router = useRouter()
  const [appt,    setAppt]    = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(false)
  const [acting,  setActing]  = useState<Status | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  function fetchAppt(id: string, showSpinner = true) {
    if (showSpinner) setLoading(true)
    setError(null)
    fetch(`/api/appointments/${id}`)
      .then(r => r.json())
      .then(d => setAppt(d.data ?? null))
      .catch(() => setError("Failed to load appointment."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!appointmentId) { setAppt(null); return }
    fetchAppt(appointmentId)
  }, [appointmentId])

  // Re-fetch silently when the admin returns to the tab — catches patient cancellations
  useEffect(() => {
    if (!appointmentId) return
    function onVisible() {
      if (document.visibilityState === "visible") fetchAppt(appointmentId!, false)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [appointmentId])

  async function doAction(status: Status) {
    if (!appt) return
    setActing(status)
    setError(null)
    const res  = await fetch(`/api/appointments/${appt.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.")
    } else {
      setAppt(prev => prev ? { ...prev, status } : prev)
      onStatusChange?.(appt.id, status)
      router.refresh()
    }
    setActing(null)
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  function dateStr() {
    if (!appt) return null
    if (appt.assignedDate) return formatDate(new Date(appt.assignedDate))
    if (appt.slot?.date)   return formatDate(new Date(appt.slot.date))
    if (appt.preferredDate) return `${formatDate(new Date(appt.preferredDate))} (preferred)`
    return null
  }
  function timeStr() {
    if (!appt) return null
    return appt.assignedTime ?? (appt.slot?.startTime ? formatTime(appt.slot.startTime) : null)
  }
  function ageStr() {
    if (!appt?.patientDOB) return null
    const dob = new Date(appt.patientDOB)
    const today = new Date()
    let a = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--
    return `${formatDate(dob)} (${a} yrs)`
  }

  const fullName = appt
    ? [appt.patientName, appt.patientSurname].filter(Boolean).join(" ")
    : ""
  const isAssigned = !!(appt?.doctor && appt?.assignedTime)

  const availableActions = appt
    ? ACTIONS.filter(a => {
        if (!a.allowed.includes(appt.status)) return false
        // Approve requires a doctor and time to already be assigned
        if (a.status === "APPROVED" && !isAssigned) return false
        return true
      })
    : []

  const needsAssignment = appt?.status === "PENDING" && !isAssigned

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Sheet open={!!appointmentId} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <SheetHeader className="shrink-0 border-b border-border px-6 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <CalendarDays className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              {loading || !appt ? (
                <>
                  <SheetTitle className="sr-only">Loading appointment…</SheetTitle>
                  <div className="h-4 w-32 animate-pulse rounded bg-[#EDE8E3]" />
                  <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-[#EDE8E3]" />
                </>
              ) : (
                <>
                  <SheetTitle className="text-base font-bold text-foreground">{fullName}</SheetTitle>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{appt.bookingRef}</span>
                    <StatusBadge status={appt.status} />
                  </div>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="space-y-3">
              {[80, 56, 68, 48].map((h, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border">
                  <div className="h-8 rounded-t-xl bg-[#F9F7F4]" />
                  <div className="p-4">
                    <div className="h-3 w-full rounded bg-[#EDE8E3]" style={{ maxWidth: h + "%" }} />
                    <div className="mt-2.5 h-3 rounded bg-[#EDE8E3]" style={{ maxWidth: (h - 20) + "%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && appt && (
            <div className="space-y-4">

              {/* Appointment */}
              <Section title="Appointment">
                <Row icon={Stethoscope}  label="Service"    value={appt.service.name} />
                <Row icon={UserRound}    label="Clinician"  value={appt.doctor?.name ?? "Not yet assigned"} dim={!appt.doctor} />
                {dateStr() && <Row icon={CalendarDays} label="Date" value={dateStr()!} />}
                {timeStr() && (
                  <Row
                    icon={Clock}
                    label="Time"
                    value={`${timeStr()} · ${appt.service.durationMins} min`}
                  />
                )}
                {appt.branch && <Row icon={Building2} label="Branch" value={appt.branch.name} />}
              </Section>

              {/* Patient */}
              <Section title="Patient">
                <Row icon={UserRound} label="Full name"  value={fullName} />
                <Row icon={Mail}      label="Email"      value={appt.patientEmail} />
                <Row icon={Phone}     label="Phone"      value={appt.patientPhone} />
                {ageStr() && <Row icon={CalendarDays} label="Date of birth" value={ageStr()!} />}
                {appt.patientGender && (
                  <Row icon={UserRound} label="Gender" value={appt.patientGender.replace(/-/g, " ")} />
                )}
              </Section>

              {/* Notes */}
              {(appt.notes || appt.attachmentName) && (
                <Section title="Notes & Attachments">
                  {appt.notes && (
                    <Row icon={FileText} label="Reason for visit" value={appt.notes} multiline />
                  )}
                  {appt.attachmentName && (
                    <Row icon={FileText} label="Attachment" value={appt.attachmentName} />
                  )}
                </Section>
              )}

              {appt.patientHistoryEnabled && appt.patientHistory && appt.patientHistory.length > 0 && (
                <Section title="Patient history">
                  {appt.patientHistory.map((item) => {
                    const itemDate = item.assignedDate ?? item.preferredDate ?? item.createdAt
                    return (
                      <div key={item.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold text-foreground">{item.service.name}</span>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-mono">{item.bookingRef}</span>
                          <span className="mx-1.5 text-[#D8CFC5]">·</span>
                          {formatDate(new Date(itemDate))}
                          {item.assignedTime && <span className="ml-1 font-medium text-foreground">{item.assignedTime}</span>}
                          {item.doctor?.name && (
                            <>
                              <span className="mx-1.5 text-[#D8CFC5]">·</span>
                              {item.doctor.name}
                            </>
                          )}
                        </p>
                      </div>
                    )
                  })}
                </Section>
              )}

              {appt.statusHistory && appt.statusHistory.length > 0 && (
                <Section title="Status history">
                  {appt.statusHistory.map((item) => (
                    <div key={item.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">
                          {item.fromStatus ? `${item.fromStatus.replace("_", " ")} -> ` : ""}
                          {item.toStatus.replace("_", " ")}
                        </p>
                        <span className="text-[11px] text-muted-foreground">{formatDate(new Date(item.createdAt))}</span>
                      </div>
                      {(item.actorName || item.note) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.actorName ?? "System"}
                          {item.actorRole && ` · ${item.actorRole.replace("_", " ")}`}
                          {item.note && ` · ${item.note}`}
                        </p>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {/* Error */}
              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer actions ───────────────────────────────────────────────── */}
        {!loading && appt && (
          <div className="shrink-0 border-t border-border bg-secondary/30 px-6 py-4 space-y-3">
            {/* Nudge when pending but not yet assigned */}
            {needsAssignment && (
              <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                <Stethoscope className="size-3.5 shrink-0" />
                Use the <strong>Assign</strong> button in the appointments list to assign a clinician and time before approving.
              </p>
            )}
            {availableActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {availableActions.map(({ status, label, icon: Icon, style }) => (
                  <button
                    key={status}
                    onClick={() => doAction(status)}
                    disabled={!!acting}
                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${style}`}
                  >
                    {acting === status
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Icon className="size-3.5" />}
                    {acting === status ? "Saving…" : label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
