"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, UserRound, Clock, Check, Loader2, Stethoscope } from "lucide-react"
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
import WorkingHoursEditor, { DEFAULT_SCHEDULE } from "@/components/admin/WorkingHoursEditor"

type Branch  = { id: string; name: string }
type Service = { id: string; name: string; durationMins: number }

type Props = {
  branches:        Branch[]
  services:        Service[]
  tenantId:        string
  defaultBranchId: string | null
  isBranchAdmin:   boolean
}

type Step = "profile" | "hours"
type HoursMode = "default" | "custom"

export default function AddDoctorDialog({ branches, services, tenantId, defaultBranchId, isBranchAdmin }: Props) {
  const router = useRouter()
  const [open,     setOpen]   = useState(false)
  const [step,     setStep]   = useState<Step>("profile")
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [mode,     setMode]   = useState<HoursMode>("default")
  const [saving,   setSaving] = useState(false)

  function handleReset() {
    setStep("profile")
    setDoctorId(null)
    setMode("default")
    setSaving(false)
  }

  async function saveDefaultAndClose() {
    if (!doctorId) return
    setSaving(true)
    try {
      await fetch("/api/working-hours", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ doctorId, schedule: DEFAULT_SCHEDULE }),
      })
      router.refresh()
      setOpen(false)
      handleReset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset() }}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-sm" size="sm">
          <Plus className="size-4" />
          Add Practitioner
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl border-border p-0">

        {step === "profile" && (
          <>
            <DialogHeader className="border-b border-border px-6 py-5">
              <div className="flex items-start gap-3 pr-8">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <UserRound className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">Add practitioner</DialogTitle>
                  <DialogDescription className="mt-1">
                    Step 1 of 2 — Create a practitioner profile and assign their services.
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
                onSaved={(id) => { setDoctorId(id); setStep("hours") }}
                className="border-0 p-0 shadow-none"
              />
            </div>
          </>
        )}

        {step === "hours" && (
          <>
            <DialogHeader className="border-b border-border px-6 py-5">
              <div className="flex items-start gap-3 pr-8">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Clock className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">Set working hours</DialogTitle>
                  <DialogDescription className="mt-1">
                    Step 2 of 2 — Choose a schedule for this doctor. You can change it anytime from the Doctors page.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-5">
              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("default")}
                  className="flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all"
                  style={{
                    borderColor: mode === "default" ? "var(--primary)" : "var(--border)",
                    background:  mode === "default" ? "color-mix(in srgb, var(--primary) 8%, #fff)" : "#fff",
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-bold text-foreground">Default</span>
                    {mode === "default" && <Check className="size-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">Mon – Fri, 09:00 – 18:00</p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("custom")}
                  className="flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all"
                  style={{
                    borderColor: mode === "custom" ? "var(--primary)" : "var(--border)",
                    background:  mode === "custom" ? "color-mix(in srgb, var(--primary) 8%, #fff)" : "#fff",
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-bold text-foreground">Custom</span>
                    {mode === "custom" && <Check className="size-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">Set specific days & times</p>
                </button>
              </div>

              {mode === "default" ? (
                <div className="rounded-xl border border-border bg-secondary/30 px-5 py-4">
                  <p className="text-sm font-semibold text-foreground">Mon – Fri · 09:00 – 18:00</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Saturday and Sunday marked as day off.</p>
                  <Button
                    className="mt-4 rounded-xl"
                    size="sm"
                    onClick={saveDefaultAndClose}
                    disabled={saving}
                  >
                    {saving
                      ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                      : "Save & finish"}
                  </Button>
                </div>
              ) : (
                doctorId && (
                  <WorkingHoursEditor
                    doctorId={doctorId}
                    isWizard
                    onSaved={() => { setOpen(false); handleReset() }}
                  />
                )
              )}

              <p className="text-xs text-muted-foreground">
                You can also skip this and set hours later using the <strong>Schedule</strong> button on the Doctors page.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
