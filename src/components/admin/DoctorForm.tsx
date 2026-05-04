"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Doctor = {
  id: string
  name: string
  speciality: string
  bio?: string | null
  photoUrl?: string | null
  branchId?: string | null
  doctorServices?: { serviceId: string }[]
}
type Branch  = { id: string; name: string }
type Service = { id: string; name: string; durationMins: number }

type Props = {
  doctor:          Doctor | null
  branches:        Branch[]
  services:        Service[]
  tenantId:        string
  defaultBranchId: string | null
  isBranchAdmin:   boolean
  onSaved?:        () => void
  className?:      string
}

export default function DoctorForm({ doctor, branches, services, defaultBranchId, isBranchAdmin, onSaved, className }: Props) {
  const router = useRouter()

  const [name,       setName]       = useState(doctor?.name ?? "")
  const [speciality, setSpeciality] = useState(doctor?.speciality ?? "")
  const [bio,        setBio]        = useState(doctor?.bio ?? "")
  const [photoUrl,   setPhotoUrl]   = useState(doctor?.photoUrl ?? "")
  // If there's exactly one branch, auto-assign it so the admin doesn't have to pick.
  const autoSingleBranch = branches.length === 1 ? branches[0].id : null
  const [branchId, setBranchId] = useState(
    doctor?.branchId ?? defaultBranchId ?? autoSingleBranch ?? ""
  )
  const [serviceIds, setServiceIds] = useState<Set<string>>(
    new Set(doctor?.doctorServices?.map((ds) => ds.serviceId) ?? [])
  )
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function toggleService(id: string) {
    setServiceIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (serviceIds.size === 0) { setError("Select at least one service."); return }
    if (!isBranchAdmin && branches.length > 1 && !branchId) { setError("Select a branch for this doctor."); return }
    setLoading(true); setError(null)

    const method = doctor ? "PATCH" : "POST"
    const url    = doctor ? `/api/doctors/${doctor.id}` : "/api/doctors"

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, speciality,
        bio:        bio      || undefined,
        photoUrl:   photoUrl || undefined,
        branchId:   branchId || undefined,
        serviceIds: Array.from(serviceIds),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }
    if (onSaved) {
      onSaved()
      router.refresh()
      return
    }
    router.push("/admin/doctors")
    router.refresh()
  }

  const hasBranches = branches.length > 0

  return (
    <form onSubmit={handleSubmit} className={cn("bg-white rounded-lg border border-border p-5 space-y-4", className)}>

      {/* Basic info */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Dr. Sarah Khan" />
        </div>
        <div className="space-y-1">
          <Label>Speciality</Label>
          <Input value={speciality} onChange={(e) => setSpeciality(e.target.value)} required placeholder="General Practitioner" />
        </div>
      </div>

      {/* Branch assignment — required for tenant admin when 2+ branches exist */}
      {hasBranches && !isBranchAdmin && branches.length > 1 && (
        <div className="space-y-1.5 p-3 rounded-lg bg-secondary border border-border">
          <div>
            <Label className="text-sm font-semibold">
              Branch <span className="text-primary">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">Which branch does this doctor work at?</p>
          </div>
          <Select value={branchId} onValueChange={setBranchId} required>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select a branch…" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Services */}
      <div className="space-y-2">
        <Label>Services offered <span className="text-primary">*</span></Label>
        {services.length === 0 ? (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            Add services first before adding a doctor.{" "}
            <a href="/admin/services" className="underline font-medium">Go to Services →</a>
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-1.5">
            {services.map((svc) => {
              const checked = serviceIds.has(svc.id)
              return (
                <button
                  key={svc.id} type="button" onClick={() => toggleService(svc.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-left text-sm transition-colors ${
                    checked
                      ? "bg-secondary border-primary text-primary"
                      : "bg-white border-border text-foreground hover:border-border/60"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    checked ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {checked && (
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="font-medium">{svc.name}</span>
                  <span className="ml-auto text-xs opacity-50">{svc.durationMins}m</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Optional fields */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Bio <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2}
            placeholder="Short description shown to patients" className="resize-none" />
        </div>
        <div className="space-y-1">
          <Label>Photo URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} type="url" placeholder="https://..." />
        </div>
      </div>

      {error && <p className="text-sm text-primary bg-secondary rounded px-3 py-2">{error}</p>}

      <Button type="submit" disabled={loading || services.length === 0} size="sm">
        {loading ? "Saving…" : doctor ? "Save Changes" : "Add Doctor"}
      </Button>
    </form>
  )
}
