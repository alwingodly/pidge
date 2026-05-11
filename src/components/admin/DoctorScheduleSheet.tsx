"use client"

import { useState } from "react"
import { CalendarOff, Clock } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import WorkingHoursEditor from "@/components/admin/WorkingHoursEditor"
import DoctorLeaveManager from "@/components/admin/DoctorLeaveManager"

type Leave = { id: string; startDate: string; endDate: string; period: string; reason: string | null }
type Tab   = "hours" | "leave"

type Props = {
  doctorId:         string
  doctorName:       string
  speciality:       string
  clinicStartTime?: string | null
  clinicEndTime?:   string | null
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
}

export default function DoctorScheduleSheet({ doctorId, doctorName, speciality, clinicStartTime, clinicEndTime }: Props) {
  const [open,          setOpen]          = useState(false)
  const [tab,           setTab]           = useState<Tab>("hours")
  const [leaves,        setLeaves]        = useState<Leave[] | null>(null)
  const [leavesLoading, setLeavesLoading] = useState(false)

  async function fetchLeaves() {
    if (leaves !== null) return
    setLeavesLoading(true)
    try {
      const res  = await fetch(`/api/doctor-leave?doctorId=${doctorId}`)
      const data = await res.json()
      setLeaves(
        (data.data ?? []).map((l: { id: string; startDate: string; endDate: string; period?: string; reason: string | null }) => ({
          id:        l.id,
          startDate: l.startDate.slice(0, 10),
          endDate:   l.endDate.slice(0, 10),
          period:    l.period ?? "FULL",
          reason:    l.reason ?? null,
        }))
      )
    } catch {
      setLeaves([])
    } finally {
      setLeavesLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) fetchLeaves()
    else { setLeaves(null); setTab("hours") }
  }

  function handleTabChange(t: Tab) {
    setTab(t)
    if (t === "leave") fetchLeaves()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          title="Manage schedule"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <Clock className="size-3.5 text-primary" />
          Schedule
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">

        {/* ── Header ── */}
        <SheetHeader className="shrink-0 px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-primary ring-1 ring-border">
              {getInitials(doctorName)}
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate text-sm font-bold text-foreground leading-tight">{doctorName}</SheetTitle>
              <p className="truncate text-xs text-muted-foreground">{speciality}</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-border">
            {([
              { key: "hours", label: "Working hours", icon: Clock },
              { key: "leave", label: "Leave",         icon: CalendarOff },
            ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors -mb-px ${
                  tab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "hours" && (
            <WorkingHoursEditor
              doctorId={doctorId}
              clinicStartTime={clinicStartTime}
              clinicEndTime={clinicEndTime}
            />
          )}

          {tab === "leave" && (
            leavesLoading || leaves === null ? (
              <div className="flex items-center justify-center py-16 text-xs text-muted-foreground">
                Loading…
              </div>
            ) : (
              <DoctorLeaveManager
                doctorId={doctorId}
                doctorName={doctorName}
                initialLeaves={leaves}
              />
            )
          )}
        </div>

      </SheetContent>
    </Sheet>
  )
}
