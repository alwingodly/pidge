"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  CalendarDays,
  Mail,
  Phone,
  UserRound,
} from "lucide-react"

export type BookingData = {
  patientName:     string
  patientSurname:  string
  patientEmail:    string
  patientPhone:    string
  patientDOB:      string
  patientGender:   string
  notes:           string
}

type Props = {
  data:                   BookingData
  onChange:               (field: keyof BookingData, value: string) => void
  onSubmit:               () => void
  loading:                boolean
  error:                  string | null
  gdprEnabled?:           boolean
  consentGiven?:          boolean
  reminderOptOut?:        boolean
  onConsentChange?:       (v: boolean) => void
  onReminderOptOutChange?:(v: boolean) => void
}

const GENDER_OPTIONS = [
  { value: "",                label: "Select…" },
  { value: "male",            label: "Male" },
  { value: "female",          label: "Female" },
  { value: "non-binary",      label: "Non-binary" },
  { value: "genderqueer",     label: "Genderqueer" },
  { value: "transgender",     label: "Transgender" },
  { value: "self-describe",   label: "Prefer to self-describe" },
  { value: "prefer-not-say",  label: "Prefer not to say" },
]

export default function BookingForm({
  data, onChange, onSubmit, loading, error,
  gdprEnabled, consentGiven, reminderOptOut,
  onConsentChange, onReminderOptOutChange,
}: Props) {
  const blockSubmit = gdprEnabled && !consentGiven

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="space-y-6">

      {/* ── Personal details ──────────────────────────────────────── */}
      <FormSection label="Personal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" icon={<UserRound className="size-4" />} required>
            <Input
              id="firstName"
              value={data.patientName}
              onChange={(e) => onChange("patientName", e.target.value)}
              required
              placeholder="Jane"
              className="rounded-xl"
            />
          </Field>

          <Field label="Surname" htmlFor="surname" icon={<UserRound className="size-4" />} required>
            <Input
              id="surname"
              value={data.patientSurname}
              onChange={(e) => onChange("patientSurname", e.target.value)}
              required
              placeholder="Smith"
              className="rounded-xl"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth" htmlFor="dob" icon={<CalendarDays className="size-4" />} required>
            <Input
              id="dob"
              type="date"
              value={data.patientDOB}
              onChange={(e) => onChange("patientDOB", e.target.value)}
              required
              max={new Date().toISOString().split("T")[0]}
              className="rounded-xl"
            />
          </Field>

          <Field label="Gender identity" htmlFor="gender" icon={<UserRound className="size-4" />} required>
            <select
              id="gender"
              value={data.patientGender}
              onChange={(e) => onChange("patientGender", e.target.value)}
              required
              className="h-10 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      {/* ── Contact ───────────────────────────────────────────────── */}
      <FormSection label="Contact">
        <Field label="Email address" htmlFor="email" icon={<Mail className="size-4" />} required>
          <Input
            id="email"
            type="email"
            value={data.patientEmail}
            onChange={(e) => onChange("patientEmail", e.target.value)}
            required
            placeholder="jane@example.com"
            className="rounded-xl"
          />
        </Field>

        <Field label="Phone number" htmlFor="phone" icon={<Phone className="size-4" />} required>
          <Input
            id="phone"
            type="tel"
            value={data.patientPhone}
            onChange={(e) => onChange("patientPhone", e.target.value)}
            required
            placeholder="+44 7700 900000"
            className="rounded-xl"
          />
        </Field>
      </FormSection>

      {/* ── Notes ────────────────────────────────────────────────── */}
      <FormSection label="Additional information">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="notes" className="text-sm font-medium">Reason for visit</Label>
            <span className="text-xs text-muted-foreground">Optional · {data.notes.length}/500</span>
          </div>
          <Textarea
            id="notes"
            value={data.notes}
            onChange={(e) => onChange("notes", e.target.value)}
            maxLength={500}
            placeholder="Brief description of your concern or symptoms…"
            rows={3}
            className="resize-none rounded-xl"
          />
        </div>
      </FormSection>

      {/* ── GDPR consent (UK mode only) ───────────────────────────── */}
      {gdprEnabled && (
        <div className="space-y-3 rounded-xl border border-border bg-secondary/30 px-4 py-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Data & privacy</p>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consentGiven ?? false}
              onChange={e => onConsentChange?.(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
              required
            />
            <span className="text-xs text-foreground leading-relaxed">
              I consent to my personal data (name, contact details, date of birth, and gender identity) being stored and processed by this clinic solely for the purpose of managing my appointment.{" "}
              <span className="text-muted-foreground">
                Your data is held securely and will not be shared with third parties without your consent.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={reminderOptOut ?? false}
              onChange={e => onReminderOptOutChange?.(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I do not want to receive email appointment reminders.
            </span>
          </label>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="h-12 w-full rounded-xl font-semibold" disabled={loading || blockSubmit}>
        {loading ? "Submitting request…" : "Submit booking request"}
      </Button>

      {blockSubmit && (
        <p className="text-center text-xs text-muted-foreground">
          Please accept the data consent above to continue.
        </p>
      )}
    </form>
  )
}

function FormSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
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
