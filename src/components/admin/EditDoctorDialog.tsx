"use client"

import { useState } from "react"
import { Pencil, UserRound } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import DoctorForm from "@/components/admin/DoctorForm"

type Doctor = {
  id: string
  name: string
  speciality: string
  bio?: string | null
  photoUrl?: string | null
  branchId?: string | null
  doctorServices?: { serviceId: string }[]
}
type Branch = { id: string; name: string }
type Service = { id: string; name: string; durationMins: number }

type Props = {
  doctor: Doctor
  branches: Branch[]
  services: Service[]
  tenantId: string
  defaultBranchId: string | null
  isBranchAdmin: boolean
}

export default function EditDoctorDialog({
  doctor,
  branches,
  services,
  tenantId,
  defaultBranchId,
  isBranchAdmin,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E8E3DC] bg-white px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-secondary"
        >
          <Pencil className="size-3" />
          Edit
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl border-[#E8E3DC] p-0">
        <DialogHeader className="border-b border-[#E8E3DC] px-6 py-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <UserRound className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">Edit doctor</DialogTitle>
              <DialogDescription className="mt-1">
                Update {doctor.name}&apos;s profile, branch, and service assignments.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <DoctorForm
            doctor={doctor}
            branches={branches}
            services={services}
            tenantId={tenantId}
            defaultBranchId={defaultBranchId}
            isBranchAdmin={isBranchAdmin}
            onSaved={() => setOpen(false)}
            className="border-0 p-0 shadow-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
