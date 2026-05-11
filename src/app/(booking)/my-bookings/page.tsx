"use client"

import { useState, useRef, Suspense } from "react"
import Link from "next/link"
import {
  ArrowRight, CalendarDays, ChevronLeft, ChevronRight,
  Clock, Mail, MapPin, RefreshCw, UserRound,
} from "lucide-react"

type Booking = {
  bookingRef:  string
  cancelToken: string
  status:      string
  service:     string
  duration:    number
  doctor:      string | null
  clinic:      string
  branch:      string | null
  address:     string | null
  date:        string
  time:        string
  isAssigned:  boolean
}

type Step = "email" | "otp" | "bookings"

const PAGE_SIZE = 6

// ── OTP digit boxes ─────────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "")

  function focus(i: number) { refs.current[Math.max(0, Math.min(5, i))]?.focus() }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, "").slice(-1)
    if (!char) return
    const arr = value.split("").slice(0, 6)
    arr[i] = char
    onChange(arr.join("").slice(0, 6))
    focus(i + 1)
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault()
      onChange(value.slice(0, i) + value.slice(i + 1))
      focus(i - 1)
    } else if (e.key === "ArrowLeft")  focus(i - 1)
    else if  (e.key === "ArrowRight") focus(i + 1)
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    onChange(pasted)
    focus(Math.min(pasted.length, 5))
  }

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onClick={() => focus(i)}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          className={`h-12 w-full rounded-lg border-2 bg-white text-center font-mono text-lg font-bold text-foreground outline-none transition-colors ${
            d ? "border-primary bg-primary/5" : "border-border focus:border-primary"
          }`}
        />
      ))}
    </div>
  )
}

// ── Status config ───────────────────────────────────────────────────────────

function statusCfg(b: Booking) {
  if (b.status === "COMPLETED") return { label: "Completed", dot: "bg-muted-foreground/50", text: "text-muted-foreground", bg: "bg-muted/40" }
  if (b.isAssigned)             return { label: "Confirmed", dot: "bg-emerald-500",         text: "text-emerald-700",      bg: "bg-emerald-50 ring-1 ring-emerald-200" }
  return                               { label: "Pending",   dot: "bg-amber-400",           text: "text-amber-700",        bg: "bg-amber-50 ring-1 ring-amber-200" }
}

// ── Mobile card ─────────────────────────────────────────────────────────────

function BookingCard({ b }: { b: Booking }) {
  const s = statusCfg(b)
  const isCompleted = b.status === "COMPLETED"
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{b.service}</p>
            <p className="font-mono text-[10px] text-muted-foreground">{b.bookingRef}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}>
            {s.label}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
          <Chip icon={<CalendarDays className="size-3" />} label={b.date} />
          <Chip icon={<Clock className="size-3" />}        label={b.isAssigned ? b.time : "TBC"} />
          {b.doctor && <Chip icon={<UserRound className="size-3" />} label={b.doctor} />}
          {b.branch  && <Chip icon={<MapPin className="size-3" />}   label={b.branch} />}
        </div>
        {!isCompleted && (
          <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
            <Link href={`/reschedule?token=${b.cancelToken}`}
              className="flex h-8 flex-1 items-center justify-center rounded-lg bg-primary/8 text-xs font-semibold text-primary hover:bg-primary/15">
              Reschedule
            </Link>
            <Link href={`/cancel?token=${b.cancelToken}`}
              className="flex h-8 flex-1 items-center justify-center rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-600">
              Cancel
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Desktop list row ─────────────────────────────────────────────────────────

function ListRow({ b }: { b: Booking }) {
  const s = statusCfg(b)
  const isCompleted = b.status === "COMPLETED"
  return (
    <div className="grid grid-cols-[1fr_140px_110px_110px_120px] items-center gap-4 border-t border-border/60 px-4 py-3 text-sm transition-colors hover:bg-secondary/30">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{b.service}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{b.bookingRef}</p>
      </div>
      <p className="text-xs text-muted-foreground">{b.date}</p>
      <p className="text-xs text-muted-foreground">{b.isAssigned ? b.time : <span className="italic">TBC</span>}</p>
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}>
        <span className={`size-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
      <div className="flex items-center gap-3 text-xs">
        {!isCompleted ? (
          <>
            <Link href={`/reschedule?token=${b.cancelToken}`} className="font-semibold text-primary hover:underline">
              Reschedule
            </Link>
            <Link href={`/cancel?token=${b.cancelToken}`} className="text-muted-foreground hover:text-red-600 hover:underline">
              Cancel
            </Link>
          </>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </div>
    </div>
  )
}

// ── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
      <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="flex size-7 items-center justify-center rounded-lg border border-border bg-white transition-colors hover:border-primary/40 disabled:opacity-40">
          <ChevronLeft className="size-3.5" />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex size-7 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${
              n === page
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white hover:border-primary/40"
            }`}>
            {n}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)} disabled={page === pages}
          className="flex size-7 items-center justify-center rounded-lg border border-border bg-white transition-colors hover:border-primary/40 disabled:opacity-40">
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 truncate">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{msg}</p>
}

// ── Main ─────────────────────────────────────────────────────────────────────

function MyBookingsContent() {
  const [step,     setStep]     = useState<Step>("email")
  const [email,    setEmail]    = useState("")
  const [otp,      setOtp]      = useState("")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [page,     setPage]     = useState(1)

  const paged = bookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null)
    const res  = await fetch("/api/booking-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, patientName: "Patient" }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setLoading(false); setStep("otp"); startCooldown(60)
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null)
    const res  = await fetch("/api/booking-otp", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    const bRes  = await fetch(`/api/patient/bookings?email=${encodeURIComponent(email)}&token=${data.bookingToken}`)
    const bData = await bRes.json()
    if (!bRes.ok) { setError(bData.error); setLoading(false); return }
    setBookings(bData.data); setLoading(false); setStep("bookings")
  }

  async function handleResend() {
    if (cooldown > 0) return
    setError(null); setOtp("")
    const res  = await fetch("/api/booking-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, patientName: "Patient" }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    startCooldown(60)
  }

  function startCooldown(s: number) {
    setCooldown(s)
    const t = setInterval(() => setCooldown(p => { if (p <= 1) { clearInterval(t); return 0 } return p - 1 }), 1000)
  }

  // Email + OTP steps stay narrow
  if (step !== "bookings") {
    return (
      <div className="mx-auto max-w-sm py-6">
        {step === "email" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">My appointments</h1>
              <p className="mt-1 text-sm text-muted-foreground">Enter your booking email to receive a verification code.</p>
            </div>
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" required autoFocus placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/15" />
              </div>
              {error && <ErrorMsg msg={error} />}
              <button type="submit" disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50">
                {loading ? "Sending…" : "Send code"} {!loading && <ArrowRight className="size-4" />}
              </button>
            </form>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Enter your code</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sent to{" "}
                <button onClick={() => { setStep("email"); setOtp(""); setError(null) }}
                  className="font-semibold text-foreground underline-offset-2 hover:underline">{email}</button>
              </p>
            </div>
            <form onSubmit={handleOtpSubmit} className="space-y-3">
              <OtpInput value={otp} onChange={setOtp} />
              {error && <ErrorMsg msg={error} />}
              <button type="submit" disabled={loading || otp.length < 6}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50">
                {loading ? "Verifying…" : "View appointments"} {!loading && <ArrowRight className="size-4" />}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Didn&apos;t get it?{" "}
                <button onClick={handleResend} disabled={cooldown > 0}
                  className="inline-flex items-center gap-1 font-semibold text-primary disabled:opacity-40 hover:underline">
                  <RefreshCw className="size-3" />
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
                </button>
              </p>
            </form>
          </div>
        )}
      </div>
    )
  }

  // Bookings step — wide layout
  return (
    <div className="py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Your appointments</h1>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <Link href="/book"
          className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:border-primary/40">
          + New booking
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
          <CalendarDays className="mx-auto mb-2 size-8 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-sm font-medium text-foreground">No appointments found</p>
          <p className="mt-1 text-xs text-muted-foreground">Bookings made with this email will appear here.</p>
          <Link href="/book"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
            Book an appointment <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop: list */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-white shadow-sm lg:block">
            <div className="grid grid-cols-[1fr_140px_110px_110px_120px] gap-4 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Service</span><span>Date</span><span>Time</span><span>Status</span><span>Actions</span>
            </div>
            {paged.map(b => <ListRow key={b.bookingRef} b={b} />)}
          </div>

          {/* Mobile/tablet: cards */}
          <div className="space-y-2.5 lg:hidden">
            {paged.map(b => <BookingCard key={b.bookingRef} b={b} />)}
          </div>

          <Pagination page={page} total={bookings.length} onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }) }} />
        </div>
      )}
    </div>
  )
}

export default function MyBookingsPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
      <MyBookingsContent />
    </Suspense>
  )
}
