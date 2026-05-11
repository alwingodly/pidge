"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  CalendarDays, Check, Clock, Mail, Phone, Stethoscope, UserRound,
} from "lucide-react"

type Service = { id: string; name: string; durationMins: number; description: string | null }
type Branch  = { id: string; name: string }

type Step = "service" | "details" | "success"

const GENDER_OPTIONS = [
  { value: "",               label: "Select…" },
  { value: "male",           label: "Male" },
  { value: "female",         label: "Female" },
  { value: "non-binary",     label: "Non-binary" },
  { value: "genderqueer",    label: "Genderqueer" },
  { value: "transgender",    label: "Transgender" },
  { value: "self-describe",  label: "Prefer to self-describe" },
  { value: "prefer-not-say", label: "Prefer not to say" },
]

export default function WalkInForm({ services, branches, defaultBranchId, tenantName }: {
  services:        Service[]
  branches:        Branch[]
  defaultBranchId: string | null
  tenantName:      string
}) {
  const [step,      setStep]      = useState<Step>("service")
  const [serviceId, setServiceId] = useState("")
  const [branchId,  setBranchId]  = useState(defaultBranchId ?? "")
  const [ref,       setRef]       = useState("")
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    patientName:    "",
    patientSurname: "",
    patientEmail:   "",
    patientPhone:   "",
    patientDOB:     "",
    patientGender:  "",
    notes:          "",
  })

  function update(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  const selectedService = services.find((s) => s.id === serviceId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        serviceId,
        patientName:    form.patientName,
        patientSurname: form.patientSurname || undefined,
        patientEmail:   form.patientEmail,
        patientPhone:   form.patientPhone,
        patientDOB:     form.patientDOB    || undefined,
        patientGender:  form.patientGender || undefined,
        notes:          form.notes         || undefined,
      }
      if (branchId) body.branchId = branchId

      const res  = await fetch("/api/checkin", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Something went wrong. Please try again."); return }
      setRef(data.bookingRef)
      setStep("success")
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1: Service selection ──────────────────────────────────────────────
  if (step === "service") {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Walk-in · {tenantName}
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-foreground">
            What brings you in today?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the service and we&apos;ll add you to the queue.
          </p>
        </div>

        {/* Branch selector — only shown when there are multiple branches */}
        {branches.length > 1 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Location
            </p>
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchId(b.id)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                    branchId === b.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white text-foreground hover:border-primary/40"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setServiceId(s.id); setStep("details") }}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <Stethoscope className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground transition-colors group-hover:text-primary">
                  {s.name}
                </p>
                {s.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {s.description}
                  </p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Clock className="size-2.5" />
                  {s.durationMins} min
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Step 2: Patient details ────────────────────────────────────────────────
  if (step === "details") {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Header with back + selected service pill */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep("service")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-1.5">
            <Stethoscope className="size-3.5 text-primary" />
            <span className="text-sm font-semibold text-foreground">{selectedService?.name}</span>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Walk-in · {tenantName}
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-foreground">
            Your details
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your details to join the queue. No appointment needed.
          </p>
        </div>

        {/* Personal details */}
        <FormSection label="Personal details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="fn" icon={<UserRound className="size-4" />} required>
              <Input
                id="fn"
                value={form.patientName}
                onChange={(e) => update("patientName", e.target.value)}
                required
                placeholder="Jane"
                className="rounded-xl"
              />
            </Field>
            <Field label="Surname" htmlFor="sn" icon={<UserRound className="size-4" />}>
              <Input
                id="sn"
                value={form.patientSurname}
                onChange={(e) => update("patientSurname", e.target.value)}
                placeholder="Smith"
                className="rounded-xl"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of birth" htmlFor="dob" icon={<CalendarDays className="size-4" />}>
              <Input
                id="dob"
                type="date"
                value={form.patientDOB}
                onChange={(e) => update("patientDOB", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="rounded-xl"
              />
            </Field>
            <Field label="Gender identity" htmlFor="gender" icon={<UserRound className="size-4" />}>
              <select
                id="gender"
                value={form.patientGender}
                onChange={(e) => update("patientGender", e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </FormSection>

        {/* Contact */}
        <FormSection label="Contact">
          <Field label="Email address" htmlFor="email" icon={<Mail className="size-4" />} required>
            <Input
              id="email"
              type="email"
              value={form.patientEmail}
              onChange={(e) => update("patientEmail", e.target.value)}
              required
              placeholder="jane@example.com"
              className="rounded-xl"
            />
          </Field>
          <Field label="Phone number" htmlFor="phone" icon={<Phone className="size-4" />} required>
            <Input
              id="phone"
              type="tel"
              value={form.patientPhone}
              onChange={(e) => update("patientPhone", e.target.value)}
              required
              placeholder="+44 7700 900000"
              className="rounded-xl"
            />
          </Field>
        </FormSection>

        {/* Notes */}
        <FormSection label="Additional information">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes" className="text-sm font-medium">Reason for visit</Label>
              <span className="text-xs text-muted-foreground">
                Optional · {form.notes.length}/500
              </span>
            </div>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              maxLength={500}
              placeholder="Brief description of your concern or symptoms…"
              rows={3}
              className="resize-none rounded-xl"
            />
          </div>
        </FormSection>

        {error && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="h-12 w-full rounded-xl font-semibold" disabled={loading}>
          {loading ? "Checking you in…" : "Check in now"}
        </Button>
      </form>
    )
  }

  // ── Step 3: Success ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10">
        <Check className="size-9 text-primary" strokeWidth={2.5} />
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          You&apos;re in the queue
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground">
          Checked in successfully
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Please take a seat. A member of the team will call your name shortly.
        </p>
      </div>

      <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-[#F3EAE0] bg-secondary/30 px-5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Your check-in reference
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="font-mono text-2xl font-black tracking-wide text-foreground">{ref}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            A confirmation has been sent to your email address.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
        {[
          "You're now in the queue",
          "No further action needed",
          "We'll call your name",
        ].map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <Check className="size-3 text-primary" strokeWidth={3} />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────

function FormSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <div className="h-px flex-1 bg-[#F0EAE2]" />
      </div>
      {children}
    </div>
  )
}

function Field({
  label, htmlFor, icon, required, children,
}: {
  label:     string
  htmlFor:   string
  icon:      ReactNode
  required?: boolean
  children:  ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-medium">
        <span className="text-primary">{icon}</span>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}
