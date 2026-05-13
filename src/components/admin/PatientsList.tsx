"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  CalendarDays, Clock, Loader2, Mail, Phone,
  Search, Stethoscope, UsersRound, UserRound, X,
} from "lucide-react"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

type Patient = {
  email:    string
  name:     string
  phone:    string
  count:    number
  lastSeen: Date | null
}

type Appointment = {
  id:            string
  bookingRef:    string
  status:        string
  preferredDate: string | null
  assignedDate:  string | null
  assignedTime:  string | null
  createdAt:     string
  patientDOB:    string
  patientGender: string
  patientPhone:  string
  notes:         string
  service:       { name: string; durationMins: number } | null
  doctor:        { name: string } | null
  branch:        { name: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED:  "bg-blue-50 text-blue-700 ring-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-600 ring-red-200",
  NO_SHOW:   "bg-zinc-100 text-zinc-500 ring-zinc-200",
}

export default function PatientsList({ patients }: { patients: Patient[] }) {
  const [query,    setQuery]    = useState("")
  const [selected, setSelected] = useState<Patient | null>(null)
  const [history,  setHistory]  = useState<Appointment[]>([])
  const [loading,  setLoading]  = useState(false)

  const q = query.trim().toLowerCase()
  const filtered = patients.filter((p) =>
    !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.phone.includes(q)
  )

  async function openPatient(p: Patient) {
    setSelected(p)
    setHistory([])
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/patient-history?email=${encodeURIComponent(p.email)}`)
      const data = await res.json()
      setHistory(data.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">

        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[#F3EAE0] px-4 py-2.5">
          <UsersRound className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">
            {patients.length} {patients.length === 1 ? "patient" : "patients"}
          </span>
          <div className="ml-auto flex h-7 w-48 items-center gap-1.5 rounded-lg border border-border px-2.5 focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="size-3 shrink-0 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            {q ? "No patients match." : "No patients yet."}
          </p>
        ) : (
          <div className="divide-y divide-[#F3EAE0]">
            {filtered.map((p) => (
              <button
                key={p.email}
                onClick={() => openPatient(p)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/40"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">
                  {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{p.name}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-2.5">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Mail className="size-2.5 shrink-0" />{p.email}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone className="size-2.5 shrink-0" />{p.phone}
                    </span>
                  </div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-[11px] font-semibold text-foreground">
                    {p.count} {p.count === 1 ? "visit" : "visits"}
                  </p>
                  {p.lastSeen && (
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(p.lastSeen), "d MMM yy")}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Patient history sheet */}
      <Sheet open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null) }}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">

          {/* Sheet header */}
          <SheetHeader className="border-b border-[#F3EAE0] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                {selected?.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-sm font-bold text-foreground">{selected?.name}</SheetTitle>
                <div className="mt-0.5 flex flex-wrap gap-x-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="size-3 shrink-0" />{selected?.email}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="size-3 shrink-0" />{selected?.phone || "—"}
                  </span>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* History */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading history…
              </div>
            ) : history.length === 0 ? (
              <div className="py-16 text-center">
                <CalendarDays className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No appointments found.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F3EAE0]">
                {history.map((appt) => {
                  const date = appt.assignedDate ?? appt.preferredDate
                  const statusStyle = STATUS_STYLES[appt.status] ?? "bg-zinc-100 text-zinc-500 ring-zinc-200"
                  return (
                    <div key={appt.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {appt.service?.name ?? "—"}
                            </p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusStyle}`}>
                              {appt.status}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            {date && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarDays className="size-3 shrink-0" />
                                {format(new Date(date), "d MMM yyyy")}
                                {appt.assignedTime && ` · ${appt.assignedTime}`}
                              </span>
                            )}
                            {appt.service?.durationMins && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="size-3 shrink-0" />
                                {appt.service.durationMins} min
                              </span>
                            )}
                            {appt.doctor && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <UserRound className="size-3 shrink-0" />
                                {appt.doctor.name}
                              </span>
                            )}
                            {appt.branch && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Stethoscope className="size-3 shrink-0" />
                                {appt.branch.name}
                              </span>
                            )}
                          </div>
                          {appt.notes && (
                            <p className="mt-1.5 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                              {appt.notes}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-[10px] text-muted-foreground">
                          #{appt.bookingRef}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#F3EAE0] px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {selected?.count} total {selected?.count === 1 ? "visit" : "visits"} · {selected?.email}
            </p>
          </div>

        </SheetContent>
      </Sheet>
    </>
  )
}
