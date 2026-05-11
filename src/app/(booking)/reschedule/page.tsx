"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowRight, CalendarDays, MoveRight } from "lucide-react"

type Preview = {
  bookingRef:  string
  patientName: string
  service:     string
  doctor:      string
  date:        string
  time:        string
}

function RescheduleContent() {
  const params = useSearchParams()
  const router = useRouter()
  const token  = params.get("token")

  const [preview,    setPreview]    = useState<Preview | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [newDate,    setNewDate]    = useState("")

  useEffect(() => {
    if (!token) { setError("Invalid reschedule link."); setLoading(false); return }
    fetch(`/api/reschedule?token=${token}&preview=true`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setPreview(data)
      })
      .catch(() => setError("Something went wrong. Please try again."))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newDate || !token) return
    setSubmitting(true)
    setError(null)

    const res  = await fetch("/api/reschedule", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token, preferredDate: newDate }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.")
      setSubmitting(false)
      return
    }

    router.push(`/confirmation/${data.bookingRef}`)
  }

  const today = new Date().toISOString().split("T")[0]

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground">Loading your appointment…</p>
  }

  if (error && !preview) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <CalendarDays className="size-8 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Move your appointment
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose a new preferred date. Our team will confirm your exact time by email.
        </p>
      </div>

      {/* Current appointment */}
      {preview && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="bg-secondary/40 px-5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Current appointment
            </p>
            <p className="mt-0.5 font-mono text-base font-bold text-foreground">
              {preview.bookingRef}
            </p>
          </div>
          <div className="divide-y divide-border px-5 text-sm">
            <Row label="Service"   value={preview.service} />
            <Row label="Clinician" value={preview.doctor} />
            <Row label="Date"      value={preview.date} />
            <Row label="Time"      value={preview.time} />
          </div>
        </div>
      )}

      {/* New date */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="bg-secondary/40 px-5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              New preferred date
            </p>
          </div>
          <div className="p-5 space-y-3">
            <input
              type="date"
              required
              min={today}
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll review availability and send a confirmation email with your new time.
            </p>
          </div>
        </div>

        {/* Change summary */}
        {newDate && preview && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm">
            <span className="font-medium text-muted-foreground line-through">{preview.date}</span>
            <MoveRight className="size-4 shrink-0 text-primary" />
            <span className="font-semibold text-foreground">
              {new Date(newDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!newDate || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:translate-y-0 disabled:opacity-50"
        >
          {submitting ? "Moving your appointment…" : "Confirm new date"}
          {!submitting && <ArrowRight className="size-4" />}
        </button>
      </form>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export default function ReschedulePage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
      <RescheduleContent />
    </Suspense>
  )
}
