"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button }   from "@/components/ui/button"
import { Clock, Stethoscope, UserRound, Users } from "lucide-react"
import AssignDialog from "./AssignDialog"

type QueueEntry = {
  id:              string
  bookingRef:      string
  patientName:     string
  patientSurname?: string | null
  checkedInAt:     Date | string | null
  serviceId:       string
  branchId?:       string | null
  status:          string
  service: { name: string; durationMins: number }
  doctor?:  { id: string; name: string } | null
  branch?:  { name: string } | null
}

type Doctor = { id: string; name: string }

function waitingLabel(checkedInAt: Date | string | null): string {
  if (!checkedInAt) return "Unknown"
  const mins = Math.floor((Date.now() - new Date(checkedInAt).getTime()) / 60_000)
  if (mins < 1)   return "Just arrived"
  if (mins === 1) return "1 min"
  if (mins < 60)  return `${mins} mins`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

function waitingBadge(checkedInAt: Date | string | null): string {
  if (!checkedInAt) return "bg-muted text-muted-foreground ring-1 ring-border"
  const mins = Math.floor((Date.now() - new Date(checkedInAt).getTime()) / 60_000)
  if (mins < 10) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
  if (mins < 20) return "bg-amber-50   text-amber-700   ring-1 ring-amber-200"
  return              "bg-red-50     text-red-600     ring-1 ring-red-200"
}

export default function WalkInQueue({ initialQueue, doctors }: {
  initialQueue: QueueEntry[]
  doctors:      Doctor[]
}) {
  const router = useRouter()

  const [rows,         setRows]         = useState(initialQueue)
  const [assignTarget, setAssignTarget] = useState<QueueEntry | null>(null)
  const [loadingId,    setLoadingId]    = useState<string | null>(null)
  const [tick,         setTick]         = useState(0)

  // Refresh waiting-time labels every 30 s
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Pull fresh queue data from the server every 30 s
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router])

  useEffect(() => { setRows(initialQueue) }, [initialQueue])

  async function handleNoShow(id: string) {
    setLoadingId(id)
    const res = await fetch(`/api/appointments/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "NO_SHOW" }),
    })
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id))
    setLoadingId(null)
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E8E3DC] bg-white py-16 text-center shadow-sm">
        <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
          <Users className="size-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">No patients waiting</p>
        <p className="mt-1 text-xs text-muted-foreground">
          New walk-ins will appear here automatically every 30 seconds.
        </p>
      </div>
    )
  }

  void tick

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Clock className="size-3.5" />
            </div>
            <p className="text-sm font-bold text-foreground">Waiting</p>
          </div>
          <span className="text-xs text-muted-foreground">{rows.length} in queue</span>
        </div>

        {/* Queue rows */}
        <div className="divide-y divide-[#F3EAE0]">
          {rows.map((entry, i) => {
            const fullName  = [entry.patientName, entry.patientSurname].filter(Boolean).join(" ")
            const badge     = waitingBadge(entry.checkedInAt)
            const waitLabel = waitingLabel(entry.checkedInAt)

            return (
              <div
                key={entry.id}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center hover:bg-secondary/20 transition-colors"
              >
                {/* Queue position badge */}
                <div className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-black text-primary">
                  {i + 1}
                </div>

                {/* Patient details */}
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}>
                      {waitLabel}
                    </span>
                  </div>
                  <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="font-mono">{entry.bookingRef}</span>
                    <span className="text-[#D8CFC5]">·</span>
                    <span className="flex items-center gap-1">
                      <Stethoscope className="size-3" />
                      {entry.service.name}
                    </span>
                    {entry.doctor && (
                      <>
                        <span className="text-[#D8CFC5]">·</span>
                        <span className="flex items-center gap-1">
                          <UserRound className="size-3" />
                          {entry.doctor.name}
                        </span>
                      </>
                    )}
                    {entry.branch && (
                      <>
                        <span className="text-[#D8CFC5]">·</span>
                        <span>{entry.branch.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 rounded-lg px-2.5 text-xs"
                    onClick={() => setAssignTarget(entry)}
                  >
                    Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg border-orange-200 px-2.5 text-xs text-orange-600 hover:bg-orange-50"
                    disabled={loadingId === entry.id}
                    onClick={() => handleNoShow(entry.id)}
                  >
                    No-show
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Assign dialog — reuses existing component */}
      {assignTarget && (
        <AssignDialog
          appointmentId={assignTarget.id}
          serviceId={assignTarget.serviceId}
          serviceName={assignTarget.service.name}
          serviceDurationMins={assignTarget.service.durationMins}
          preferredDate={null}
          initialDoctorId={assignTarget.doctor?.id ?? null}
          branchId={assignTarget.branchId ?? null}
          open={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => {
            setRows((prev) => prev.filter((r) => r.id !== assignTarget.id))
            setAssignTarget(null)
          }}
        />
      )}
    </>
  )
}
