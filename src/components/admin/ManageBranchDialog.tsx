"use client"

import { useState } from "react"
import { Check, Copy, Download, GitBranch, MapPin, Phone, Clock, Users } from "lucide-react"
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

export default function ManageBranchDialog({
  branch,
  checkinUrl,
  qrDataUrl,
}: {
  branch:      Branch
  checkinUrl:  string
  qrDataUrl:   string
}) {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(checkinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const a    = document.createElement("a")
    a.href     = qrDataUrl
    a.download = `checkin-qr-${branch.name.toLowerCase().replace(/\s+/g, "-")}.png`
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl">
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border-border p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
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

          {/* Walk-in QR */}
          <div className="border-b border-[#F3EAE0] px-5 py-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Walk-in QR Code
            </p>
            <div className="flex items-start gap-4">
              <div className="overflow-hidden rounded-xl border border-[#F0EAE2] bg-white p-2 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Walk-in check-in QR code" width={80} height={80} className="block" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="break-all font-mono text-[11px] text-muted-foreground">{checkinUrl}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 rounded-lg border-border text-xs" onClick={handleCopy}>
                    {copied
                      ? <><Check className="mr-1 size-3 text-emerald-600" />Copied!</>
                      : <><Copy className="mr-1 size-3" />Copy</>}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 rounded-lg border-border text-xs" onClick={handleDownload}>
                    <Download className="mr-1 size-3" />Download
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Print at A5 and display at reception.</p>
              </div>
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
