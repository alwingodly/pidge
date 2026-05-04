"use client"

import { useState } from "react"
import { GitBranch, MapPin, Phone, Clock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import BranchAdminManager from "@/components/admin/BranchAdminManager"

type BranchAdmin = { id: string; name: string; email: string; isActive: boolean }

type Branch = {
  id:       string
  name:     string
  slug:     string
  address:  string | null
  phone:    string | null
  timezone: string | null
  isActive: boolean
  _count:   { doctors: number; appointments: number }
  adminUsers: BranchAdmin[]
}

export default function ManageBranchDialog({ branch }: { branch: Branch }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl">
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border-[#E8E3DC] p-0">
        <DialogHeader className="border-b border-[#E8E3DC] px-5 py-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <GitBranch className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">{branch.name}</DialogTitle>
              <DialogDescription className="mt-1">
                Branch details and admin access.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* Details */}
          <div className="border-b border-[#F3EAE0] px-5 py-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <MapPin className="size-3.5" />,  label: "Address",  value: branch.address  || "—" },
                { icon: <Phone className="size-3.5" />,   label: "Phone",    value: branch.phone    || "—" },
                { icon: <Clock className="size-3.5" />,   label: "Timezone", value: branch.timezone || "Clinic default" },
                { icon: <Users className="size-3.5" />,   label: "Activity", value: `${branch._count.doctors} doctors · ${branch._count.appointments} bookings` },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="truncate text-sm font-medium text-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Branch admins */}
          <div className="px-5 py-4">
            <div className="mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Branch admins
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Can manage only this branch — doctors, slots, and appointments.
              </p>
            </div>
            <BranchAdminManager
              branchId={branch.id}
              branchName={branch.name}
              initialAdmins={branch.adminUsers}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
