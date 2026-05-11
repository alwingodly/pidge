import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  CalendarPlus, CheckCircle2, Clock, Mail,
  MapPin, Phone, Stethoscope, UserRound, Inbox,
} from "lucide-react"

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour   = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${period}`
}

function addMins(d: Date, time: string, mins: number) {
  const [h, m] = time.split(":").map(Number)
  const start  = new Date(d)
  start.setUTCHours(h, m, 0, 0)
  return new Date(start.getTime() + mins * 60_000)
}

function gcalUrl(
  startDate: Date, time: string, durationMins: number,
  title: string, location?: string,
) {
  const start = addMins(startDate, time, 0)
  const end   = addMins(startDate, time, durationMins)
  const fmt   = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"
  const params = new URLSearchParams({
    action:   "TEMPLATE",
    text:     title,
    dates:    `${fmt(start)}/${fmt(end)}`,
    ...(location ? { location } : {}),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = await params

  const appointment = await prisma.appointment.findUnique({
    where:   { bookingRef: ref },
    include: {
      slot:    true,
      service: true,
      doctor:  true,
      branch:  { select: { name: true, address: true, phone: true } },
      tenant:  { select: { name: true, gdprEnabled: true } },
    },
  })

  if (!appointment) notFound()

  const isAssigned =
    !!(appointment.assignedDate && appointment.assignedTime) || !!appointment.slot

  const confirmedDate =
    appointment.assignedDate ?? appointment.slot?.date ?? null

  const confirmedTime =
    appointment.assignedTime ?? appointment.slot?.startTime ?? null

  const patientFirst = appointment.patientName.split(" ")[0]
  const cancelHref   = `/cancel?token=${appointment.cancelToken}`

  const calendarUrl =
    isAssigned && confirmedDate && confirmedTime
      ? gcalUrl(
          new Date(confirmedDate),
          confirmedTime,
          appointment.service.durationMins,
          `${appointment.service.name} – ${appointment.tenant.name}`,
          appointment.branch?.address ?? undefined,
        )
      : null

  return (
    <div className="mx-auto max-w-md space-y-6 py-4">

      {/* ── State badge + headline ───────────────────────────────────────── */}
      <div className="text-center">
        {isAssigned ? (
          <>
            <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="size-10 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              You&apos;re all set, {patientFirst}!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your appointment is confirmed. Details below and in your email.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-primary/8 ring-8 ring-primary/5">
              <Inbox className="size-10 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Request received, {patientFirst}!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;ll assign a clinician and confirm your time by email shortly.
            </p>
          </>
        )}
      </div>

      {/* ── Ticket card ─────────────────────────────────────────────────── */}
      <div className="overflow-visible rounded-2xl border border-border bg-white shadow-sm">

        {/* Reference strip */}
        <div className="flex items-center justify-between bg-secondary/40 px-5 py-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Booking reference
            </p>
            <p className="mt-0.5 font-mono text-lg font-bold tracking-wide text-foreground">
              {appointment.bookingRef}
            </p>
          </div>
          <div className={`flex size-10 items-center justify-center rounded-xl ${
            isAssigned
              ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
              : "bg-amber-50 text-amber-600 ring-1 ring-amber-200"
          }`}>
            {isAssigned
              ? <CheckCircle2 className="size-5" strokeWidth={2} />
              : <Clock className="size-5" strokeWidth={2} />}
          </div>
        </div>

        {/* Tear line */}
        <div className="relative flex items-center px-0">
          <div className="-ml-3 size-6 rounded-full bg-[#F7F3EF]" />
          <div className="flex-1 border-t border-dashed border-border" />
          <div className="-mr-3 size-6 rounded-full bg-[#F7F3EF]" />
        </div>

        {/* Detail rows */}
        <div className="divide-y divide-[#F3EAE0] px-1">
          <DetailRow icon={<Stethoscope className="size-4" />} label="Service">
            <span className="font-semibold text-foreground">{appointment.service.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {appointment.service.durationMins} min
            </span>
          </DetailRow>

          {appointment.doctor && (
            <DetailRow icon={<UserRound className="size-4" />} label="Clinician">
              <span className="font-semibold text-foreground">{appointment.doctor.name}</span>
              {appointment.doctor.speciality && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {appointment.doctor.speciality}
                </span>
              )}
            </DetailRow>
          )}

          {isAssigned && confirmedDate ? (
            <DetailRow icon={<CalendarPlus className="size-4" />} label="Date">
              <span className="font-semibold text-foreground">{fmtDate(confirmedDate)}</span>
            </DetailRow>
          ) : appointment.preferredDate ? (
            <DetailRow icon={<CalendarPlus className="size-4" />} label="Preferred date">
              <span className="font-semibold text-foreground">
                {fmtDate(appointment.preferredDate)}
              </span>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                <Clock className="size-2.5" /> Pending
              </span>
            </DetailRow>
          ) : null}

          {isAssigned && confirmedTime && (
            <DetailRow icon={<Clock className="size-4" />} label="Time">
              <span className="font-semibold text-foreground">{fmtTime(confirmedTime)}</span>
            </DetailRow>
          )}

          {appointment.branch && (
            <DetailRow icon={<MapPin className="size-4" />} label="Location">
              <div>
                <span className="font-semibold text-foreground">{appointment.branch.name}</span>
                {appointment.branch.address && (
                  <p className="text-xs text-muted-foreground">{appointment.branch.address}</p>
                )}
              </div>
            </DetailRow>
          )}

          <DetailRow icon={<Mail className="size-4" />} label="Confirmation sent to">
            <span className="font-medium text-foreground">{appointment.patientEmail}</span>
          </DetailRow>

          {appointment.branch?.phone && (
            <DetailRow icon={<Phone className="size-4" />} label="Clinic phone">
              <span className="font-medium text-foreground">{appointment.branch.phone}</span>
            </DetailRow>
          )}
        </div>
      </div>

      {/* ── Calendar button (confirmed only) ────────────────────────────── */}
      {calendarUrl && (
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/30"
        >
          <CalendarPlus className="size-4 text-primary" />
          Add to Google Calendar
        </a>
      )}

      {/* ── What happens next (pending only) ────────────────────────────── */}
      {!isAssigned && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-[#F3EAE0] px-5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              What happens next
            </p>
          </div>
          <div className="space-y-0 divide-y divide-[#F3EAE0]">
            {[
              { n: 1, done: true,  label: "Request submitted",          sub: "We have your details"                       },
              { n: 2, done: false, label: "Team reviews your request",   sub: "Usually within 1 business day"              },
              { n: 3, done: false, label: "Confirmation email sent",     sub: "With your clinician, date and time"         },
            ].map(({ n, done, label, sub }) => (
              <div key={n} className="flex items-start gap-3.5 px-5 py-3.5">
                <div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-emerald-100 text-emerald-700"
                    : "border border-border bg-white text-muted-foreground"
                }`}>
                  {done ? <CheckCircle2 className="size-3.5" strokeWidth={2.5} /> : n}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer actions ───────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 pb-4 text-center">
        <Link href="/book" className="text-sm font-semibold text-primary hover:underline">
          Book another appointment
        </Link>
        <Link
          href="/my-bookings"
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          View all my appointments
        </Link>
        <Link
          href={`/reschedule?token=${appointment.cancelToken}`}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Move to a different date
        </Link>
        <Link
          href={cancelHref}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Cancel this {isAssigned ? "appointment" : "request"}
        </Link>

        {appointment.tenant.gdprEnabled && (
          <Link
            href={`/erase?token=${appointment.cancelToken}&email=${encodeURIComponent(appointment.patientEmail)}`}
            className="text-[11px] text-muted-foreground/60 underline-offset-2 hover:text-muted-foreground hover:underline"
          >
            Request deletion of my personal data
          </Link>
        )}
      </div>

    </div>
  )
}

// ── sub-components ────────────────────────────────────────────────────────────

function DetailRow({
  icon, label, children,
}: {
  icon:     React.ReactNode
  label:    string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          {children}
        </div>
      </div>
    </div>
  )
}
