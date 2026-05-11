"use client"

import { useState } from "react"
import { Briefcase, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import ServiceForm from "@/components/admin/ServiceForm"

export default function AddServiceDialog({ tenantId, currencySymbol }: { tenantId: string; currencySymbol: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-sm" size="sm">
          <Plus className="size-4" />
          Add Service
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border-border p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Briefcase className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Add service</DialogTitle>
              <DialogDescription className="mt-1">
                Create a bookable service with its default appointment duration.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="p-5">
          <ServiceForm
            tenantId={tenantId}
            currencySymbol={currencySymbol}
            onSaved={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
