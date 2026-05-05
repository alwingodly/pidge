"use client"

import { useState, useRef } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DatePickerButton } from "@/components/ui/date-picker"
import BookingForm from "./BookingForm"
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from "lucide-react"

type Branch  = { id: string; name: string; address: string | null }
type BranchConfig = { branchId: string; isOffered: boolean; isAvailable: boolean }
type Service = {
  id: string
  name: string
  durationMins: number
  description?: string | null
  branchConfigs: BranchConfig[]
}

type State = {
  step:            number
  branchId:        string | null
  serviceId:       string | null
  preferredDate:   string | null
  patientName:     string
  patientSurname:  string
  patientEmail:    string
  patientPhone:    string
  patientAddress:  string
  patientPostcode: string
  patientCity:     string
  patientDOB:      string
  patientGender:   string
  notes:           string
}

export default function BookingSteps({
  services,
  branches,
  defaultBranchId,
}: {
  services:        Service[]
  branches:        Branch[]
  defaultBranchId: string | null
}) {
  const router = useRouter()

  // Show a location step only when the caller passes 2+ branches to choose from.
  const hasLocationStep = branches.length > 1

  const STEPS = hasLocationStep
    ? ["Location", "Service", "Date", "Details", "Verify"]
    : ["Service", "Date", "Details", "Verify"]

  // Step numbers depend on whether the location step is present.
  const locationStep = hasLocationStep ? 1 : 0
  const serviceStep  = hasLocationStep ? 2 : 1
  const dateStep     = hasLocationStep ? 3 : 2
  const detailsStep  = hasLocationStep ? 4 : 3
  const otpStep      = hasLocationStep ? 5 : 4

  const [state, setState] = useState<State>({
    step:            1,
    branchId:        defaultBranchId,
    serviceId:       null,
    preferredDate:   null,
    patientName:     "",
    patientSurname:  "",
    patientEmail:    "",
    patientPhone:    "",
    patientAddress:  "",
    patientPostcode: "",
    patientCity:     "",
    patientDOB:      "",
    patientGender:   "",
    notes:           "",
  })
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [otpDigits,   setOtpDigits]   = useState(["", "", "", ""])
  const [otpSending,  setOtpSending]  = useState(false)
  const [otpVerifying,setOtpVerifying]= useState(false)
  const [otpError,    setOtpError]    = useState<string | null>(null)

  function set<K extends keyof State>(key: K, value: State[K]) {
    setState((p) => ({ ...p, [key]: value }))
  }

  // Per-branch availability filtering
  function serviceStatus(svc: Service): "available" | "unavailable" | "hidden" {
    if (!state.branchId) return "available"
    const cfg = svc.branchConfigs.find((c) => c.branchId === state.branchId)
    if (!cfg) return "available"
    if (!cfg.isOffered) return "hidden"
    if (!cfg.isAvailable) return "unavailable"
    return "available"
  }

  const visibleServices = services.filter((s) => serviceStatus(s) !== "hidden")
  const selectedService = services.find((s) => s.id === state.serviceId)
  const selectedBranch  = branches.find((b) => b.id === state.branchId)

  // Step 1: send OTP then advance to verify step
  async function handleSendOTP() {
    setOtpSending(true)
    setOtpError(null)
    try {
      const res = await fetch("/api/booking-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: state.patientEmail, patientName: state.patientName }),
      })
      if (!res.ok) { setError("Failed to send verification code. Please try again."); return }
      setOtpDigits(["", "", "", ""])
      set("step", otpStep)
    } finally {
      setOtpSending(false)
    }
  }

  // Step 2: verify OTP then create booking
  async function handleVerifyAndBook() {
    const otp = otpDigits.join("")
    if (otp.length < 4) { setOtpError("Please enter the 4-digit code."); return }

    setOtpVerifying(true)
    setOtpError(null)
    try {
      const verifyRes = await fetch("/api/booking-otp", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ otp }),
      })
      if (!verifyRes.ok) {
        const d = await verifyRes.json().catch(() => null)
        setOtpError(d?.error ?? "Incorrect code. Please try again.")
        return
      }

      setSubmitting(true)
      const res = await fetch("/api/appointments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId:        state.branchId        || undefined,
          serviceId:       state.serviceId,
          preferredDate:   state.preferredDate,
          patientName:     state.patientName,
          patientSurname:  state.patientSurname  || undefined,
          patientEmail:    state.patientEmail,
          patientPhone:    state.patientPhone,
          patientAddress:  state.patientAddress  || undefined,
          patientPostcode: state.patientPostcode || undefined,
          patientCity:     state.patientCity     || undefined,
          patientDOB:      state.patientDOB      || undefined,
          patientGender:   state.patientGender   || undefined,
          notes:           state.notes           || undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setOtpError(data?.error ?? "Something went wrong."); return }
      router.push(`/confirmation/${data.bookingRef}`)
    } finally {
      setOtpVerifying(false)
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">

      {/* ── Main panel ──────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-[#E8D8C5] bg-white shadow-sm">

        {/* Step indicator */}
        <div className="border-b border-[#E8D8C5] px-5 py-4">
          <div className="flex items-center">
            {STEPS.map((label, i) => {
              const step   = i + 1
              const active = state.step === step
              const done   = state.step > step
              return (
                <div key={label} className="flex flex-1 items-center">
                  <div className="flex items-center gap-2">
                    <div className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${
                      active ? "border-primary bg-primary text-white"
                      : done  ? "border-primary/30 bg-primary/8 text-primary"
                      :         "border-[#E8D8C5] bg-white text-muted-foreground"
                    }`}>
                      {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                    </div>
                    <span className={`hidden text-xs font-semibold sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`mx-2 h-px flex-1 transition-colors ${done ? "bg-primary/30" : "bg-[#E8D8C5]"}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">

          {/* Step: Location */}
          {hasLocationStep && state.step === locationStep && (
            <div className="space-y-4">
              <StepHeading
                icon={<MapPin className="size-4.5" />}
                title="Choose a location"
                description="Select the branch you'd like to visit."
              />
              <div className="space-y-1.5">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => { set("branchId", branch.id); set("step", serviceStep) }}
                    className="group flex w-full items-center gap-3.5 rounded-xl border border-[#E8D8C5] bg-white px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-secondary/30"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <MapPin className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {branch.name}
                      </p>
                      {branch.address && (
                        <p className="truncate text-xs text-muted-foreground">{branch.address}</p>
                      )}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Service */}
          {state.step === serviceStep && (
            <div className="space-y-4">
              <StepHeading
                icon={<Stethoscope className="size-4.5" />}
                title="Choose a service"
                description="What are you coming in for? This helps us prepare the right treatment."
              />
              {visibleServices.length === 0 ? (
                <EmptyState text="No services available at this location yet." />
              ) : (
                <div className="space-y-1.5">
                  {visibleServices.map((service) => {
                    const status = serviceStatus(service)
                    const unavailable = status === "unavailable"
                    return (
                      <button
                        key={service.id}
                        type="button"
                        disabled={unavailable}
                        onClick={() => { if (!unavailable) { set("serviceId", service.id); set("step", dateStep) } }}
                        className={`group flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-all ${
                          unavailable
                            ? "cursor-not-allowed border-[#E8D8C5] bg-[#FAFAF9] opacity-70"
                            : "border-[#E8D8C5] bg-white hover:border-primary/40 hover:bg-secondary/30"
                        }`}
                      >
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${unavailable ? "bg-muted text-muted-foreground" : "bg-secondary text-primary"}`}>
                          <Stethoscope className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-semibold transition-colors ${unavailable ? "text-muted-foreground" : "text-foreground group-hover:text-primary"}`}>
                              {service.name}
                            </p>
                            {unavailable && (
                              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                Temporarily unavailable
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="truncate text-xs text-muted-foreground">{service.description}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">{service.durationMins} min</span>
                        {!unavailable && <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />}
                      </button>
                    )
                  })}
                </div>
              )}
              {hasLocationStep && (
                <Button variant="outline" size="sm" className="rounded-xl bg-white" onClick={() => set("step", locationStep)}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
              )}
            </div>
          )}

          {/* Step: Date */}
          {state.step === dateStep && (
            <div className="space-y-4">
              <StepHeading
                icon={<CalendarClock className="size-4.5" />}
                title="When would you like to come in?"
                description="Pick your preferred date. Our team will confirm a time and clinician by email."
              />

              <DatePickerButton
                value={state.preferredDate ? new Date(state.preferredDate) : undefined}
                onChange={(d) => {
                  if (!d) { set("preferredDate", null); return }
                  // Use local date parts — toISOString() converts to UTC and shifts
                  // the day back for users in UTC+ timezones.
                  const y  = d.getFullYear()
                  const m  = String(d.getMonth() + 1).padStart(2, "0")
                  const dy = String(d.getDate()).padStart(2, "0")
                  set("preferredDate", `${y}-${m}-${dy}`)
                }}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                placeholder="Choose your preferred date"
              />

              <div className="flex items-start gap-3 rounded-xl border border-[#E8D8C5] bg-secondary/30 px-4 py-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary/60" />
                <p className="text-sm text-muted-foreground">
                  You don&apos;t need to pick a time — our team will match you with the right clinician and send your confirmed appointment details by email.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="rounded-xl bg-white" onClick={() => set("step", serviceStep)}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
                {state.preferredDate && (
                  <Button size="sm" className="rounded-xl" onClick={() => set("step", detailsStep)}>
                    Continue <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step: Patient details */}
          {/* Step: Patient details */}
          {state.step === detailsStep && (
            <div className="space-y-4">
              <StepHeading
                icon={<Check className="size-4.5" />}
                title="Your details"
                description="We'll use these to send your confirmation and any updates."
              />
              <BookingForm
                data={{
                  patientName:     state.patientName,
                  patientSurname:  state.patientSurname,
                  patientEmail:    state.patientEmail,
                  patientPhone:    state.patientPhone,
                  patientAddress:  state.patientAddress,
                  patientPostcode: state.patientPostcode,
                  patientCity:     state.patientCity,
                  patientDOB:      state.patientDOB,
                  patientGender:   state.patientGender,
                  notes:           state.notes,
                }}
                onChange={(field, value) => set(field as keyof State, value)}
                onSubmit={handleSendOTP}
                loading={otpSending}
                error={error}
              />
              <Button variant="outline" size="sm" className="rounded-xl bg-white" onClick={() => set("step", dateStep)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
            </div>
          )}

          {/* Step: Email OTP verification */}
          {state.step === otpStep && (
            <div className="space-y-6">
              <StepHeading
                icon={<ShieldCheck className="size-4.5" />}
                title="Verify your email"
                description={`We sent a 4-digit code to ${state.patientEmail}. Enter it below to confirm your booking.`}
              />

              <OTPInput
                value={otpDigits}
                onChange={setOtpDigits}
              />

              {otpError && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive">
                  {otpError}
                </p>
              )}

              <Button
                className="h-12 w-full rounded-xl font-semibold"
                onClick={handleVerifyAndBook}
                disabled={otpVerifying || submitting || otpDigits.join("").length < 4}
              >
                {(otpVerifying || submitting)
                  ? <><Loader2 className="size-4 animate-spin" /> Verifying…</>
                  : "Confirm booking →"}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl bg-white"
                  onClick={() => { set("step", detailsStep); setOtpDigits(["","","",""]); setOtpError(null) }}
                >
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={otpSending}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline disabled:opacity-50"
                >
                  {otpSending ? "Sending…" : "Resend code"}
                </button>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ── Summary sidebar ─────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-[#E8D8C5] bg-white shadow-sm">
          <div className="border-b border-[#E8D8C5] bg-secondary/30 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Summary</p>
          </div>
          <div className="px-4 py-3">
            {selectedBranch && (
              <SummaryRow
                icon={<MapPin className="size-3.5" />}
                label="Location"
                value={selectedBranch.name}
              />
            )}
            <SummaryRow
              icon={<Stethoscope className="size-3.5" />}
              label="Service"
              value={selectedService?.name ?? null}
              badge={selectedService ? `${selectedService.durationMins} min` : null}
            />
            <SummaryRow
              icon={<CalendarClock className="size-3.5" />}
              label="Preferred date"
              value={state.preferredDate
                ? new Date(state.preferredDate).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                : null}
            />
            <div className="mt-3 rounded-xl border border-[#E8D8C5] bg-secondary/30 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                A clinician and confirmed time will be assigned by our team and sent to your email.
              </p>
            </div>
          </div>
        </div>
      </aside>

    </div>
  )
}

function StepHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        {icon}
      </div>
      <div>
        <h1 className="text-base font-bold text-foreground">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function SummaryRow({ icon, label, value, badge }: {
  icon:   ReactNode
  label:  string
  value:  string | null
  badge?: string | null
}) {
  return (
    <div className="flex items-start gap-2.5 border-t border-[#F3EAE0] py-3 first:border-t-0 first:pt-0">
      <div className="mt-0.5 shrink-0 text-primary/50">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={`mt-0.5 text-sm font-semibold ${value ? "text-foreground" : "text-muted-foreground/50"}`}>
          {value ?? "—"}
        </p>
      </div>
      {badge && (
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {badge}
        </span>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-[#E8D8C5] bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function OTPInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(i: number, raw: string) {
    if (!/^\d*$/.test(raw)) return
    const next = [...value]
    next[i] = raw.slice(-1)
    onChange(next)
    if (raw && i < 3) refs.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4)
    const next   = digits.split("").concat(["", "", "", ""]).slice(0, 4)
    onChange(next)
    refs.current[Math.min(digits.length, 3)]?.focus()
  }

  return (
    <div className="flex justify-center gap-3">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoComplete="one-time-code"
          className="size-14 rounded-xl border-2 border-[#E8D8C5] bg-white text-center text-2xl font-bold text-foreground outline-none transition-colors focus:border-primary"
        />
      ))}
    </div>
  )
}
