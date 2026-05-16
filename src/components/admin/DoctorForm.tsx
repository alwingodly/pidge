"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Practitioner type config ───────────────────────────────────────────────────
export const PRACTITIONER_TYPES = [
  {
    value:       "VAIDYA",
    label:       "Vaidya",
    desc:        "Ayurvedic physician",
    placeholder: "e.g. Panchakarma, Nadi Pariksha",
  },
  {
    value:       "THERAPIST",
    label:       "Therapist",
    desc:        "Treatment & body therapies",
    placeholder: "e.g. Abhyanga, Shirodhara",
  },
  {
    value:       "CONSULTANT",
    label:       "Consultant",
    desc:        "Nutrition, yoga & lifestyle",
    placeholder: "e.g. Diet & Nutrition, Yoga",
  },
  {
    value:       "OTHER",
    label:       "Other",
    desc:        "Other practitioner role",
    placeholder: "e.g. Herbalist, Marma therapist",
  },
] as const

export type PractitionerType = (typeof PRACTITIONER_TYPES)[number]["value"]

// ── Badge helper (reused in the list page) ────────────────────────────────────
const TYPE_BADGE: Record<PractitionerType, { bg: string; text: string; ring: string }> = {
  VAIDYA:     { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200"   },
  THERAPIST:  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200"},
  CONSULTANT: { bg: "bg-purple-50",  text: "text-purple-700",  ring: "ring-purple-200" },
  OTHER:      { bg: "bg-gray-50",    text: "text-gray-600",    ring: "ring-gray-200"   },
}

export function PractitionerBadge({ type }: { type: string }) {
  const meta = TYPE_BADGE[type as PractitionerType] ?? TYPE_BADGE.OTHER
  const label = PRACTITIONER_TYPES.find(t => t.value === type)?.label ?? type
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${meta.bg} ${meta.text} ${meta.ring}`}>
      {label}
    </span>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────
type Doctor = {
  id: string
  name: string
  practitionerType?: string | null
  speciality: string
  bio?: string | null
  photoUrl?: string | null
  branchId?: string | null
  showInBooking?: boolean | null
  doctorServices?: { serviceId: string }[]
}
type Branch  = { id: string; name: string }
type Service = { id: string; name: string; durationMins: number; price?: number }

type Props = {
  doctor:               Doctor | null
  branches:             Branch[]
  services:             Service[]
  tenantId:             string
  defaultBranchId:      string | null
  isBranchAdmin:        boolean
  showDoctorSelection?: boolean  // tenant flag — show "accepts bookings" toggle only when true
  onSaved?:             (doctorId: string) => void
  className?:           string
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DoctorForm({
  doctor, branches, services, defaultBranchId, isBranchAdmin, showDoctorSelection, onSaved, className,
}: Props) {
  const router = useRouter()

  const [practitionerType, setPractitionerType] = useState<PractitionerType>(
    (doctor?.practitionerType as PractitionerType) ?? "VAIDYA"
  )
  const [name,       setName]       = useState(doctor?.name ?? "")
  const [speciality, setSpeciality] = useState(doctor?.speciality ?? "")
  const [bio,        setBio]        = useState(doctor?.bio ?? "")
  const [photoUrl,   setPhotoUrl]   = useState(doctor?.photoUrl ?? "")
  const autoSingleBranch = branches.length === 1 ? branches[0].id : null
  const [branchId,   setBranchId]   = useState(
    doctor?.branchId ?? defaultBranchId ?? autoSingleBranch ?? ""
  )
  const [serviceIds, setServiceIds] = useState<Set<string>>(
    new Set(doctor?.doctorServices?.map(ds => ds.serviceId) ?? [])
  )
  const [showInBooking, setShowInBooking] = useState(doctor?.showInBooking ?? true)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const selectedType = PRACTITIONER_TYPES.find(t => t.value === practitionerType)!

  function toggleService(id: string) {
    setServiceIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isBranchAdmin && branches.length > 1 && !branchId) { setError("Select a branch."); return }
    setLoading(true); setError(null)

    const method = doctor ? "PATCH" : "POST"
    const url    = doctor ? `/api/doctors/${doctor.id}` : "/api/doctors"

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, practitionerType,
        speciality,
        bio:           bio      || undefined,
        photoUrl:      photoUrl || undefined,
        branchId:      branchId || undefined,
        serviceIds:    Array.from(serviceIds),
        showInBooking,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }

    if (onSaved) { onSaved(data.data?.id ?? data.id ?? ""); router.refresh(); return }
    router.push("/admin/doctors")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5", className)}>

      {/* ── Practitioner type ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Practitioner type <span className="text-primary">*</span></Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRACTITIONER_TYPES.map(t => {
            const active = practitionerType === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => { setPractitionerType(t.value); setSpeciality("") }}
                className="flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all"
                style={{
                  borderColor: active ? "var(--primary)" : "var(--border)",
                  background:  active ? "color-mix(in srgb, var(--primary) 8%, #fff)" : "#fff",
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{t.label}</span>
                  {active && <Check className="size-3.5 text-primary" />}
                </div>
                <span className="text-[10px] leading-tight text-muted-foreground">{t.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Name & speciality ─────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Full name <span className="text-primary">*</span></Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder={practitionerType === "VAIDYA" ? "Dr. Arjun Sharma" : "Full name"}
          />
        </div>
        <div className="space-y-1">
          <Label>Speciality <span className="text-primary">*</span></Label>
          <Input
            value={speciality}
            onChange={e => setSpeciality(e.target.value)}
            required
            placeholder={selectedType.placeholder}
          />
        </div>
      </div>

      {/* ── Branch ────────────────────────────────────────────────────────── */}
      {!isBranchAdmin && branches.length > 1 && (
        <div className="space-y-1.5 rounded-lg border border-border bg-secondary p-3">
          <div>
            <Label className="text-sm font-semibold">
              Branch <span className="text-primary">*</span>
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">Which branch does this practitioner work at?</p>
          </div>
          <Select value={branchId} onValueChange={setBranchId} required>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select a branch…" />
            </SelectTrigger>
            <SelectContent>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Services ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Services offered <span className="text-xs font-normal text-muted-foreground">(optional for consultants)</span></Label>
        {services.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-600">
            Add services first.{" "}
            <a href="/admin/services" className="font-medium underline">Go to Services →</a>
          </p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {services.map(svc => {
              const checked = serviceIds.has(svc.id)
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleService(svc.id)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    checked
                      ? "border-primary bg-secondary text-primary"
                      : "border-border bg-white text-foreground hover:border-border/60"
                  }`}
                >
                  <div className={`flex size-3.5 shrink-0 items-center justify-center rounded border ${
                    checked ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {checked && <Check className="size-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className="font-medium">{svc.name}</span>
                  <span className="ml-auto shrink-0 text-xs opacity-50">
                    {svc.durationMins}m{svc.price ? ` · ${svc.price}` : ""}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {services.length > 0 && serviceIds.size === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No services selected — this practitioner won&apos;t appear during booking. Add services later if they&apos;re a consultant or new to the clinic.
          </p>
        )}
      </div>

      {/* ── Optional fields ───────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Bio <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={2}
            placeholder="Short description shown to patients"
            className="resize-none"
          />
        </div>
        <div className="space-y-1">
          <Label>Photo URL <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Input
            value={photoUrl}
            onChange={e => setPhotoUrl(e.target.value)}
            type="url"
            placeholder="https://…"
          />
        </div>
      </div>

      {/* Booking visibility — only shown when the clinic has doctor selection turned on */}
      {showDoctorSelection && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white px-4 py-3">
          <div
            role="switch"
            aria-checked={showInBooking}
            onClick={() => setShowInBooking(v => !v)}
            className={cn(
              "relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              showInBooking ? "bg-primary" : "bg-muted"
            )}
          >
            <span className={cn(
              "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform",
              showInBooking ? "translate-x-4" : "translate-x-0"
            )} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Accepts patient appointments</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {showInBooking
                ? "Patients can choose this person when booking. Turn off for support staff who work behind the scenes."
                : "Internal use only — admin assigns work to them directly. Patients won't see this person during booking."}
            </p>
          </div>
        </label>
      )}

      {error && (
        <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-primary">{error}</p>
      )}

      <Button type="submit" disabled={loading} size="sm">
        {loading ? "Saving…" : doctor ? "Save changes" : `Add ${selectedType.label}`}
      </Button>
    </form>
  )
}
