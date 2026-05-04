"use client"

import { useState } from "react"
import { Clock } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import WorkingHoursEditor from "@/components/admin/WorkingHoursEditor"

type Props = {
  doctorId:   string
  doctorName: string
  speciality: string
}

export default function DoctorScheduleSheet({ doctorId, doctorName, speciality }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          title="Manage schedule"
          className="flex items-center gap-1.5 rounded-lg border border-[#E8D8C5] bg-secondary/40 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <Clock className="size-3.5 text-primary" />
          Schedule
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-[#E8E3DC] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Clock className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-foreground">{doctorName}</SheetTitle>
              <p className="text-xs text-muted-foreground">{speciality} · Weekly working hours</p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-4 text-xs text-muted-foreground">
            Toggle days on/off and set start and end times. Changes apply to new appointment assignments immediately.
          </p>
          <WorkingHoursEditor doctorId={doctorId} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
