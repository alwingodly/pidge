"use client"

import { useState } from "react"
import { Plus, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import DoctorForm from "@/components/admin/DoctorForm"

type Branch = { id: string; name: string }
type Service = { id: string; name: string; durationMins: number }

type Props = {
  branches: Branch[]
  services: Service[]
  tenantId: string
  defaultBranchId: string | null
  isBranchAdmin: boolean
}

export default function AddDoctorDialog({
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
        <Button className="rounded-xl shadow-sm" size="sm">
          <Plus className="size-4" />
          Add Doctor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl border-[#E8E3DC] p-0">
        <DialogHeader className="border-b border-[#E8E3DC] px-6 py-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <UserRound className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">Add doctor</DialogTitle>
              <DialogDescription className="mt-1">
                Create a clinician profile and assign the services they can provide.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <DoctorForm
            doctor={null}
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
