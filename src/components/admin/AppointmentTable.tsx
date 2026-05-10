"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils"
import { CalendarDays, CalendarClock, ChevronLeft, ChevronRight, Search, Stethoscope, UserRound, X } from "lucide-react"
import AssignDialog from "./AssignDialog"
import RescheduleDialog from "./RescheduleDialog"
import AppointmentDetailSheet from "./AppointmentDetailSheet"

type Appointment = {
  id:              string
  bookingRef:      string
  patientName:     string
  patientSurname?: string | null
  status:          string
  appointmentType?: string | null
  serviceId:       string
  branchId?:       string | null
  preferredDate?:  Date | null
  assignedDate?:   Date | null
  assignedTime?:   string | null
  checkedInAt?:    Date | null
  slot?:           { date: Date; startTime: string } | null
  service:         { name: string; durationMins: number }
  doctor?:         { id: string; name: string } | null
  branch?:         { name: string } | null
}

type Doctor  = { id: string; name: string }
type Service = { id: string; name: string }
type Branch = { id: string; name: string }
type Filters = {
  status: string
  date: string
  doctorId: string
  serviceId: string
  branchId: string
  q: string
  page: string
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:    "bg-amber-50  text-amber-700  ring-amber-200",
  CHECKED_IN: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  APPROVED:   "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED:  "bg-red-50    text-red-600    ring-red-200",
  COMPLETED:  "bg-[#EAF3F5] text-[#3A8A97]  ring-[#C5DFE4]",
  NO_SHOW:    "bg-orange-50 text-orange-600 ring-orange-200",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground ring-border"}`}>
      {status.replace("_", " ")}
    </span>
  )
}

function apptDateStr(appt: Appointment): string | null {
  if (appt.assignedDate)  return formatDate(appt.assignedDate)
  if (appt.slot?.date)    return formatDate(appt.slot.date)
  if (appt.preferredDate) return `${formatDate(appt.preferredDate)} (pref)`
  return null
}

function apptTimeStr(appt: Appointment): string | null {
  if (appt.assignedTime)    return appt.assignedTime
  if (appt.slot?.startTime) return appt.slot.startTime
  return null
}

export default function AppointmentTable({ appointments, doctors, services, branches, filters, total, pageSize, clinicStartTime, clinicEndTime }: {
  appointments:    Appointment[]
  doctors:         Doctor[]
  services:        Service[]
  branches:        Branch[]
  filters:         Filters
  total:           number
  pageSize:        number
  clinicStartTime?: string | null
  clinicEndTime?:   string | null
}) {
  const router = useRouter()

  // Local rows for optimistic status/date updates (cancel, assign, reschedule).
  // Reset whenever the server sends a fresh page (navigation or filter change).
  const [rows,             setRows]             = useState(appointments)
  const [cancelTarget,     setCancelTarget]     = useState<string | null>(null)
  const [assignTarget,     setAssignTarget]     = useState<Appointment | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const [loadingId,        setLoadingId]        = useState<string | null>(null)
  const [detailId,         setDetailId]         = useState<string | null>(null)
  const [search,           setSearch]           = useState(filters.q)

  useEffect(() => { setRows(appointments) }, [appointments])
  useEffect(() => { setSearch(filters.q) }, [filters.q])

  // Silently re-fetch table data when admin returns to the tab
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [router])

  const currentPage = Math.max(1, parseInt(filters.page, 10) || 1)
  const totalPages  = Math.max(1, Math.ceil(total / pageSize))

  function updateFilter(key: keyof Filters, value: string) {
    // Any filter change resets to page 1 except explicit page changes
    const newPage = key === "page" ? value : "1"
    const params  = new URLSearchParams({ ...filters, [key]: value, page: newPage })
    for (const [paramKey, paramValue] of Array.from(params.entries())) {
      if (!paramValue || paramValue === "ALL" || (paramKey === "page" && paramValue === "1")) {
        params.delete(paramKey)
      }
    }
    router.push(`?${params.toString()}`)
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    updateFilter("q", search.trim())
  }

  async function handleCancel(id: string) {
    setLoadingId(id)
    const res = await fetch(`/api/appointments/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "CANCELLED" }),
    })
    if (res.ok) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: "CANCELLED" } : r))
    }
    setLoadingId(null)
    setCancelTarget(null)
  }

  // ── Pagination helpers ─────────────────────────────────────────────────────
  function goToPage(p: number) {
    updateFilter("page", String(Math.max(1, Math.min(totalPages, p))))
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…")
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="space-y-3">

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={submitSearch} className="relative min-w-56 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, ref"
            className="h-8 rounded-xl border-[#E8D8C5] bg-white pl-8 pr-8 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); updateFilter("q", "") }}
              className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </form>

        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="h-8 w-36 rounded-xl border-[#E8D8C5] bg-white text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {["ALL","CHECKED_IN","PENDING","APPROVED","CANCELLED","COMPLETED","NO_SHOW"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All statuses" : s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.date} onValueChange={(v) => updateFilter("date", v)}>
          <SelectTrigger className="h-8 w-30 rounded-xl border-[#E8D8C5] bg-white text-xs">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAY">Today</SelectItem>
            <SelectItem value="TOMORROW">Tomorrow</SelectItem>
            <SelectItem value="WEEK">This week</SelectItem>
            <SelectItem value="ALL">All time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.doctorId} onValueChange={(v) => updateFilter("doctorId", v)}>
          <SelectTrigger className="h-8 w-40 rounded-xl border-[#E8D8C5] bg-white text-xs">
            <SelectValue placeholder="Doctor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All doctors</SelectItem>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.serviceId} onValueChange={(v) => updateFilter("serviceId", v)}>
          <SelectTrigger className="h-8 w-44 rounded-xl border-[#E8D8C5] bg-white text-xs">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All services</SelectItem>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {branches.length > 0 && (
          <Select value={filters.branchId} onValueChange={(v) => updateFilter("branchId", v)}>
            <SelectTrigger className="h-8 w-40 rounded-xl border-[#E8D8C5] bg-white text-xs">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {total} result{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-primary">
              <CalendarDays className="size-3.5" />
            </div>
            <p className="text-sm font-bold text-foreground">Appointments</p>
          </div>
          <span className="text-xs text-muted-foreground">{total} rows</span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <CalendarDays className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">No appointments found</p>
            <p className="mt-1 text-xs text-muted-foreground">Try adjusting the filters above.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#F3EAE0]">
              {rows.map((appt) => {
                const dateStr  = apptDateStr(appt)
                const timeStr  = apptTimeStr(appt)
                const fullName = [appt.patientName, appt.patientSurname].filter(Boolean).join(" ")

                return (
                  <div
                    key={appt.id}
                    className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center hover:bg-secondary/20 transition-colors"
                  >
                    {/* Left — patient + meta */}
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          onClick={() => setDetailId(appt.id)}
                          className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                        >
                          {fullName}
                        </button>
                        <StatusBadge status={appt.status} />
                        {appt.appointmentType === "WALK_IN" && (
                          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 ring-1 ring-indigo-200">
                            Walk-in
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{appt.bookingRef}</span>
                        <span className="text-[#D8CFC5]">·</span>
                        <span className="flex items-center gap-1">
                          <Stethoscope className="size-3" />
                          {appt.service.name}
                        </span>
                        {appt.doctor && (
                          <>
                            <span className="text-[#D8CFC5]">·</span>
                            <span className="flex items-center gap-1">
                              <UserRound className="size-3" />
                              {appt.doctor.name}
                            </span>
                          </>
                        )}
                        {dateStr && (
                          <>
                            <span className="text-[#D8CFC5]">·</span>
                            <span>
                              {dateStr}
                              {timeStr && <span className="ml-1 font-medium text-foreground">{timeStr}</span>}
                            </span>
                          </>
                        )}
                        {appt.branch && (
                          <>
                            <span className="text-[#D8CFC5]">·</span>
                            <span>{appt.branch.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right — actions */}
                    <div className="flex items-center gap-1.5">
                      {["PENDING", "CHECKED_IN"].includes(appt.status) && (
                        <Button
                          size="sm"
                          className="h-7 rounded-lg px-2.5 text-xs"
                          onClick={() => setAssignTarget(appt)}
                        >
                          Assign
                        </Button>
                      )}
                      {appt.status === "APPROVED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg border-amber-200 px-2.5 text-xs text-amber-600 hover:bg-amber-50"
                          onClick={() => setRescheduleTarget(appt)}
                        >
                          <CalendarClock className="size-3 mr-1" />
                          Reschedule
                        </Button>
                      )}
                      {["PENDING", "CHECKED_IN", "APPROVED"].includes(appt.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg border-red-200 px-2.5 text-xs text-red-600 hover:bg-red-50"
                          disabled={loadingId === appt.id}
                          onClick={() => setCancelTarget(appt.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Pagination ───────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#F3EAE0] px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                  <span className="mx-1.5 text-[#D8CFC5]">·</span>
                  {total} total
                </span>
                <div className="flex items-center gap-1">
                  {/* First */}
                  <Button
                    size="sm" variant="outline"
                    className="h-7 w-7 rounded-lg p-0 border-[#E8D8C5]"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(1)}
                    title="First page"
                  >
                    <ChevronLeft className="size-3.5" />
                    <ChevronLeft className="-ml-2 size-3.5" />
                  </Button>
                  {/* Previous */}
                  <Button
                    size="sm" variant="outline"
                    className="h-7 w-7 rounded-lg p-0 border-[#E8D8C5]"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                    title="Previous page"
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>

                  {/* Page number pills with smart ellipsis */}
                  {pageNumbers.map((p, i) =>
                    p === "…" ? (
                      <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                    ) : (
                      <Button
                        key={p}
                        size="sm"
                        variant={currentPage === p ? "default" : "outline"}
                        className="h-7 min-w-7 rounded-lg px-2 text-xs border-[#E8D8C5]"
                        onClick={() => goToPage(p)}
                      >
                        {p}
                      </Button>
                    ),
                  )}

                  {/* Next */}
                  <Button
                    size="sm" variant="outline"
                    className="h-7 w-7 rounded-lg p-0 border-[#E8D8C5]"
                    disabled={currentPage === totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    title="Next page"
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                  {/* Last */}
                  <Button
                    size="sm" variant="outline"
                    className="h-7 w-7 rounded-lg p-0 border-[#E8D8C5]"
                    disabled={currentPage === totalPages}
                    onClick={() => goToPage(totalPages)}
                    title="Last page"
                  >
                    <ChevronRight className="size-3.5" />
                    <ChevronRight className="-ml-2 size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Assign dialog ────────────────────────────────────────────── */}
      {assignTarget && (
        <AssignDialog
          appointmentId={assignTarget.id}
          serviceId={assignTarget.serviceId}
          serviceName={assignTarget.service.name}
          serviceDurationMins={assignTarget.service.durationMins}
          preferredDate={assignTarget.preferredDate ?? null}
          initialDoctorId={assignTarget.doctor?.id ?? null}
          branchId={assignTarget.branchId ?? null}
          clinicStartTime={clinicStartTime}
          clinicEndTime={clinicEndTime}
          open={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={(doctorName, _date, time) => {
            setRows((prev) =>
              prev.map((r) =>
                r.id === assignTarget.id
                  ? { ...r, status: "APPROVED", doctor: { id: r.doctor?.id ?? "", name: doctorName }, assignedTime: time }
                  : r,
              ),
            )
          }}
        />
      )}

      {/* ── Reschedule dialog ────────────────────────────────────────── */}
      {rescheduleTarget && (
        <RescheduleDialog
          appointmentId={rescheduleTarget.id}
          serviceId={rescheduleTarget.serviceId}
          serviceName={rescheduleTarget.service.name}
          serviceDurationMins={rescheduleTarget.service.durationMins}
          currentDate={
            rescheduleTarget.assignedDate
              ? new Date(rescheduleTarget.assignedDate)
              : rescheduleTarget.slot?.date
              ? new Date(rescheduleTarget.slot.date)
              : null
          }
          currentTime={rescheduleTarget.assignedTime ?? rescheduleTarget.slot?.startTime ?? null}
          currentDoctorId={rescheduleTarget.doctor?.id ?? null}
          branchId={rescheduleTarget.branchId ?? null}
          clinicStartTime={clinicStartTime}
          clinicEndTime={clinicEndTime}
          open={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onRescheduled={(doctorName, _date, time) => {
            setRows((prev) =>
              prev.map((r) =>
                r.id === rescheduleTarget.id
                  ? { ...r, doctor: { id: r.doctor?.id ?? "", name: doctorName }, assignedDate: new Date(_date), assignedTime: time }
                  : r,
              ),
            )
            router.refresh()
          }}
        />
      )}

      {/* ── Appointment detail sheet ─────────────────────────────────── */}
      <AppointmentDetailSheet
        appointmentId={detailId}
        onClose={() => setDetailId(null)}
        onStatusChange={(id, status) =>
          setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
        }
      />

      {/* ── Cancel confirm dialog ────────────────────────────────────── */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cancel this appointment?</DialogTitle>
            <DialogDescription>
              Confirm cancellation and notify the patient by email.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">The patient will be notified by email.</p>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCancelTarget(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={!!loadingId}
              onClick={() => cancelTarget && handleCancel(cancelTarget)}
            >
              Yes, cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
