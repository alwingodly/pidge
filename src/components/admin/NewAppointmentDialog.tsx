"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import ManualAppointmentForm from "@/components/admin/ManualAppointmentForm"

type Service = {
  id: string
  name: string
  durationMins: number
  branchConfigs: { branchId: string; isOffered: boolean; isAvailable: boolean }[]
}
type Doctor = { id: string; name: string; branchId: string | null; doctorServices: { serviceId: string }[] }
type Branch = { id: string; name: string }

export default function NewAppointmentDialog({
  services,
  doctors,
  branches,
  branchModeEnabled,
  defaultBranchId,
  clinicStartTime,
  clinicEndTime,
}: {
  services: Service[]
  doctors: Doctor[]
  branches: Branch[]
  branchModeEnabled: boolean
  defaultBranchId?: string | null
  clinicStartTime?: string | null
  clinicEndTime?: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-sm" size="sm">
          <Plus className="size-4" />
          New appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-2xl border-[#E8E3DC] p-0">
        <DialogHeader className="border-b border-[#E8E3DC] px-6 py-5">
          <DialogTitle className="text-lg font-bold text-foreground">New appointment</DialogTitle>
          <DialogDescription>
            Create an appointment from a phone or reception request.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <ManualAppointmentForm
            services={services}
            doctors={doctors}
            branches={branches}
            branchModeEnabled={branchModeEnabled}
            defaultBranchId={defaultBranchId}
            clinicStartTime={clinicStartTime}
            clinicEndTime={clinicEndTime}
            onCreated={() => setOpen(false)}
            className="border-0 p-0 shadow-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
