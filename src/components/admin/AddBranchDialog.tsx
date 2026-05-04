"use client"

import { useState } from "react"
import { GitBranch, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import BranchForm from "@/components/admin/BranchForm"

export default function AddBranchDialog({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-sm" size="sm">
          <Plus className="size-4" />
          Add Branch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border-[#E8E3DC] p-0">
        <DialogHeader className="border-b border-[#E8E3DC] px-5 py-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <GitBranch className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Add branch</DialogTitle>
              <DialogDescription className="mt-1">
                Create a new location for your clinic.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="p-5">
          <BranchForm tenantId={tenantId} onSaved={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
