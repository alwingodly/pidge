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
import IosConfirmDialog from "@/components/admin/IosConfirmDialog"
import ExpandToProgrammeModal from "@/components/admin/ExpandToProgrammeModal"

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
  serviceId?: string; doctorId?: string | null
  recurrenceGroupId?: string | null
  recurrenceIndex?: number | null; recurrenceTotal?: number | null
  finalPrice?: number | null
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
  const [appt,          setAppt]          = useState<Appointment | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [acting,        setActing]        = useState<Status | null>(null)
  const [error,         setError]         = useState<string | null>(null)
  const [confirmStatus,  setConfirmStatus]  = useState<Status | null>(null)
  const [showProgramme,  setShowProgramme]  = useState(false)
  const [showFinalPrice, setShowFinalPrice] = useState(false)
  const [finalPrice,     setFinalPrice]     = useState("")

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
    if (isNaN(dob.getTime())) return "[deleted]"
    const today = new Date()
    let a = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--
    return `${formatDate(dob)} (${a} yrs)`
  }

  const fullName = appt
    ? [appt.patientName, appt.patientSurname].filter(Boolean).join(" ")
    : ""
  const availableActions = appt
    ? ACTIONS.filter(a => a.allowed.includes(appt.status))
    : []

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
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
            {availableActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {availableActions.map(({ status, label, icon: Icon, style }) => {
                  const needsConfirm = status === "CANCELLED" || status === "NO_SHOW"
                  const isFinalSession =
                    status === "COMPLETED" &&
                    appt?.recurrenceGroupId &&
                    appt.recurrenceIndex != null &&
                    appt.recurrenceTotal != null &&
                    appt.recurrenceIndex === appt.recurrenceTotal
                  return (
                    <button
                      key={status}
                      onClick={() => {
                        if (isFinalSession) { setFinalPrice(""); setShowFinalPrice(true) }
                        else if (needsConfirm) setConfirmStatus(status)
                        else doAction(status)
                      }}
                      disabled={!!acting}
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${style}`}
                    >
                      {acting === status
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Icon className="size-3.5" />}
                      {acting === status ? "Saving…" : label}
                    </button>
                  )
                })}
              </div>
            )}
            {/* Expand to programme — shown for approved single appointments with doctor + date assigned */}
            {appt.status === "APPROVED"
              && !appt.recurrenceGroupId
              && appt.doctorId
              && appt.assignedDate
              && appt.assignedTime
              && (
              <button
                onClick={() => setShowProgramme(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <CalendarDays className="size-4" />
                Make this a programme
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>

    {/* ── Final-session price dialog ─────────────────────────────────────────── */}
    {showFinalPrice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 mx-auto">
            <Check className="size-6 text-emerald-600" />
          </div>
          <h2 className="mt-3 text-center text-base font-bold text-foreground">Final session complete</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            This is the last session of the programme. Enter the final treatment price (optional).
          </p>
          <div className="mt-4 flex h-10 overflow-hidden rounded-xl border border-input focus-within:ring-2 focus-within:ring-ring">
            <span className="flex items-center border-r border-input bg-secondary px-3 text-sm font-semibold text-muted-foreground">£</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={finalPrice}
              onChange={e => setFinalPrice(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-background px-3 text-sm text-foreground outline-none"
              autoFocus
            />
          </div>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">Leave blank to skip — you can update this later.</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowFinalPrice(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground"
            >
              Cancel
            </button>
            <button
              disabled={!!acting}
              onClick={async () => {
                setShowFinalPrice(false)
                if (!appt) return
                setActing("COMPLETED")
                setError(null)
                const body: Record<string, unknown> = { status: "COMPLETED" }
                const parsed = parseFloat(finalPrice)
                if (!isNaN(parsed) && parsed >= 0) body.finalPrice = parsed
                const res  = await fetch(`/api/appointments/${appt.id}`, {
                  method:  "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body:    JSON.stringify(body),
                })
                const data = await res.json()
                if (!res.ok) setError(data.error ?? "Something went wrong.")
                else {
                  setAppt(prev => prev ? { ...prev, status: "COMPLETED", finalPrice: body.finalPrice as number ?? null } : prev)
                  onStatusChange?.(appt.id, "COMPLETED")
                  router.refresh()
                }
                setActing(null)
              }}
              className="flex-1 rounded-xl bg-[#7EACB5] py-2.5 text-sm font-semibold text-white"
            >
              {acting === "COMPLETED" ? "Saving…" : "Mark completed"}
            </button>
          </div>
        </div>
      </div>
    )}

    <IosConfirmDialog
      open={!!confirmStatus}
      onOpenChange={v => { if (!v) setConfirmStatus(null) }}
      icon={
        <div className={`flex size-14 items-center justify-center rounded-full ${confirmStatus === "CANCELLED" ? "bg-red-50" : "bg-amber-50"}`}>
          {confirmStatus === "CANCELLED"
            ? <X className="size-6 text-destructive" />
            : <UserX className="size-6 text-amber-600" />}
        </div>
      }
      title={confirmStatus === "CANCELLED" ? "Cancel appointment?" : "Mark as no-show?"}
      description={
        confirmStatus === "CANCELLED"
          ? "The patient will be notified by email. This cannot be undone."
          : "This will mark the patient as not attending."
      }
      confirmLabel={confirmStatus === "CANCELLED" ? "Cancel appointment" : "Mark no-show"}
      loading={!!acting}
      onConfirm={() => {
        if (confirmStatus) {
          doAction(confirmStatus)
          setConfirmStatus(null)
        }
      }}
    />

    {appt?.doctorId && appt.serviceId && appt.assignedDate && appt.assignedTime && (
      <ExpandToProgrammeModal
        open={showProgramme}
        onClose={() => setShowProgramme(false)}
        onExpanded={() => {
          setShowProgramme(false)
          fetchAppt(appt.id)
        }}
        appointment={{
          id:           appt.id,
          doctorId:     appt.doctorId!,
          serviceId:    appt.serviceId!,
          assignedDate: appt.assignedDate!.slice(0, 10),
          assignedTime: appt.assignedTime!,
          serviceName:  appt.service.name,
          doctorName:   appt.doctor?.name ?? "Unknown",
        }}
      />
    )}
    </>
  )
}
