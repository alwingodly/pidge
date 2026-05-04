"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

type BranchConfig = {
  branchId:    string
  isOffered:   boolean
  isAvailable: boolean
}

type Branch = { id: string; name: string }

type Service = {
  id:           string
  name:         string
  description:  string | null
  durationMins: number
  isActive:     boolean
  branchConfigs: BranchConfig[]
}

type Props = {
  service:       Service
  branches:      Branch[]
  isTenantAdmin: boolean
  myBranchId:    string | null  // null = tenant admin (sees all)
}

export default function EditServiceDialog({ service, branches, isTenantAdmin, myBranchId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Basic info state
  const [name,         setName]         = useState(service.name)
  const [description,  setDescription]  = useState(service.description ?? "")
  const [durationMins, setDurationMins] = useState(String(service.durationMins))
  const [isActive,     setIsActive]     = useState(service.isActive)
  const [saving,       setSaving]       = useState(false)
  const [savedInfo,    setSavedInfo]    = useState(false)
  const [infoError,    setInfoError]    = useState<string | null>(null)

  // Branch config state — keyed by branchId
  const [configs, setConfigs] = useState<Record<string, BranchConfig>>(() => {
    const map: Record<string, BranchConfig> = {}
    for (const b of branches) {
      const existing = service.branchConfigs.find((c) => c.branchId === b.id)
      map[b.id] = existing ?? { branchId: b.id, isOffered: true, isAvailable: true }
    }
    return map
  })
  const [configSaving, setConfigSaving] = useState<string | null>(null)

  async function saveInfo() {
    setSaving(true); setInfoError(null); setSavedInfo(false)
    const res = await fetch(`/api/services/${service.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, description: description || undefined, durationMins: parseInt(durationMins), isActive }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setInfoError(data.error ?? "Something went wrong."); return }
    setSavedInfo(true)
    router.refresh()
    setTimeout(() => setSavedInfo(false), 2500)
  }

  async function toggleConfig(branchId: string, field: "isOffered" | "isAvailable", value: boolean) {
    setConfigSaving(branchId + field)
    const res = await fetch("/api/service-branch-config", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ serviceId: service.id, branchId, [field]: value }),
    })
    if (res.ok) {
      setConfigs((prev) => ({ ...prev, [branchId]: { ...prev[branchId], [field]: value } }))
      router.refresh()
    }
    setConfigSaving(null)
  }

  // Branches visible to this admin
  const visibleBranches = myBranchId
    ? branches.filter((b) => b.id === myBranchId)
    : branches

  const showBranchSection = visibleBranches.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl">Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border-[#E8E3DC] p-0">
        <DialogHeader className="border-b border-[#E8E3DC] px-5 py-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Briefcase className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">{service.name}</DialogTitle>
              <DialogDescription className="mt-1">Edit service details and branch availability.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* Basic info — tenant admin only */}
          {isTenantAdmin && (
            <div className="border-b border-[#F3EAE0] px-5 py-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Details</p>

              <div className="space-y-1.5">
                <Label className="text-xs">Service name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="resize-none rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Duration (min)</Label>
                  <Input type="number" min="5" step="5" value={durationMins} onChange={(e) => setDurationMins(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <select
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                    className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {infoError && <p className="text-sm text-destructive">{infoError}</p>}

              <Button size="sm" className="rounded-xl" onClick={saveInfo} disabled={saving || savedInfo}>
                {saving   ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                : savedInfo ? <><Check className="size-4" /> Saved</>
                : "Save changes"}
              </Button>
            </div>
          )}

          {/* Branch availability */}
          {showBranchSection && (
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Branch availability</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isTenantAdmin
                    ? "Control whether this service is offered and available at each branch."
                    : "Mark this service as temporarily unavailable at your branch."}
                </p>
              </div>

              <div className="space-y-2">
                {visibleBranches.map((branch) => {
                  const cfg = configs[branch.id] ?? { branchId: branch.id, isOffered: true, isAvailable: true }
                  const busy = configSaving?.startsWith(branch.id)
                  return (
                    <div key={branch.id} className="rounded-xl border border-[#E8E3DC] bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{branch.name}</p>
                      <div className="mt-2 flex flex-wrap gap-4">

                        {/* Offered toggle — tenant admin only */}
                        {isTenantAdmin && (
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={cfg.isOffered}
                              disabled={!!busy}
                              onChange={(e) => toggleConfig(branch.id, "isOffered", e.target.checked)}
                              className="accent-primary"
                            />
                            <span className="text-xs font-medium text-foreground">Offered here</span>
                            {!cfg.isOffered && (
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Hidden from patients</span>
                            )}
                          </label>
                        )}

                        {/* Available toggle — shown when offered */}
                        {cfg.isOffered && (
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={cfg.isAvailable}
                              disabled={!!busy}
                              onChange={(e) => toggleConfig(branch.id, "isAvailable", e.target.checked)}
                              className="accent-primary"
                            />
                            <span className="text-xs font-medium text-foreground">Currently available</span>
                            {!cfg.isAvailable && (
                              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">Temporarily unavailable</span>
                            )}
                          </label>
                        )}

                        {!cfg.isOffered && !isTenantAdmin && (
                          <span className="text-xs text-muted-foreground italic">Not offered at this branch</span>
                        )}

                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
