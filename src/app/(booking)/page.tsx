import { prisma } from "@/lib/db"
import { getTenantFromHeaders } from "@/lib/tenant"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight, CalendarCheck, CalendarDays, Check,
  Clock, MapPin, Stethoscope, UserRound, Zap,
} from "lucide-react"
import { Fragment } from "react"
import styles from "./BookingLanding.module.css"

export default async function BookingHomePage() {
  const { tenantId, branchId, tenantName, tenantSlug, logoUrl } = await getTenantFromHeaders()

  if (!tenantId) {
    if (!tenantSlug) redirect("/admin/login")

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
          <MapPin className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Clinic not found</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Visit your clinic&apos;s booking page at{" "}
          <span className="font-mono">clinicname.pikatym.com</span>.
        </p>
      </div>
    )
  }

  const services = await prisma.service.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
  })

  void branchId

  return (
    <div className="space-y-5 pb-8">

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  HERO                                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className={`${styles.hero} relative overflow-hidden rounded-[2rem] px-6 py-14 sm:px-12 sm:py-20`}>

        {/* Depth mesh */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-8 top-0 h-px bg-white/80" />
          <div className={styles.heroBeamLeft} />
          <div className={styles.heroBeamRight} />
        </div>

        <div className="relative grid items-center gap-14 lg:grid-cols-[1fr_420px]">

          {/* ── Left copy ── */}
          <div>
            {/* Animated brand pill */}
            <div className={`${styles.glassChip} mb-8 inline-flex items-center gap-2.5 rounded-full py-1.5 pl-2 pr-4 text-xs`}>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              {logoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt={tenantName || "Clinic"} className="size-4 rounded object-contain" />
                </>
              ) : (
                <span className="flex size-4 shrink-0 items-center justify-center rounded bg-primary text-[9px] font-black text-primary-foreground shadow-sm">
                  {(tenantName || "P")[0]}
                </span>
              )}
              <span className="font-semibold text-foreground">{tenantName}</span>
              <span className="hidden text-muted-foreground sm:inline">· Booking open now</span>
            </div>

            {/* Headline — 3-line rhythm, 7xl on desktop */}
            <h1 className={`${styles.heroTitle} text-5xl font-black leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl`}>
              Healthcare
              <br />
              <span className={styles.heroAccent}>made simple</span>
              <br />
              for you.
            </h1>

            <p className="mt-5 max-w-[440px] text-[15px] leading-7 text-muted-foreground">
              Book an appointment at{" "}
              <span className="font-semibold text-foreground">{tenantName}</span>{" "}
              in minutes — choose a service, pick a date, done.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/book"
                className={`${styles.primaryButton} group inline-flex items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground transition-all duration-200 hover:-translate-y-px hover:opacity-95`}>
                Book appointment
                <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRight className="size-3.5" />
                </span>
              </Link>
              <a href="#services"
                className={`${styles.glassChip} inline-flex items-center justify-center rounded-2xl px-6 py-4 text-sm font-semibold text-foreground transition-all duration-200 hover:-translate-y-px`}>
                See all services
              </a>
            </div>

            {/* Stat chips — 3 across on all screens */}
            <div className="mt-10 grid grid-cols-3 gap-2">
              {[
                { v: services.length, s: "services" },
                { v: "3 min",         s: "avg. booking" },
                { v: "24 / 7",        s: "available" },
              ].map(({ v, s }) => (
                <div key={s} className={`${styles.glassCard} rounded-2xl px-3 py-3 text-center`}>
                  <p className="text-lg font-black tabular-nums text-foreground">{v}</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right preview card — desktop only ── */}
          <div className="relative hidden lg:block">

            {/* Floating "just confirmed" chip */}
            <div className={`${styles.glassChip} absolute -left-12 top-8 z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5`}>
              <div className={`${styles.iconWell} flex size-7 shrink-0 items-center justify-center rounded-xl text-primary`}>
                <CalendarCheck className="size-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-foreground">Just confirmed</p>
                <p className="text-[10px] text-muted-foreground">General Consult · Today</p>
              </div>
            </div>

            {/* Card — slight rotation */}
            <div className={`${styles.previewCard} ${styles.glassCard} overflow-hidden rounded-[1.75rem]`}
              style={{ transform: "rotate(1.5deg)" }}>

              {/* Solid primary header */}
              <div className={`${styles.previewHeader} relative px-5 py-5 backdrop-blur-xl`}>
                <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-primary-foreground/45" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">Appointment</p>
                    <p className="mt-0.5 text-base font-black text-primary-foreground">Booking confirmed</p>
                    <p className="text-[11px] text-primary-foreground/60">Ref #PD-2025-001</p>
                  </div>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/15">
                    <Check className="size-5 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                </div>

                {/* Avatar stack + count */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[
                      "bg-primary/[0.90]", "bg-primary/[0.72]",
                      "bg-primary/[0.54]", "bg-primary/[0.36]",
                    ].map((bg, i) => (
                      <div key={i}
                        className={`flex size-7 items-center justify-center rounded-full border-2 border-primary text-[10px] font-black text-primary-foreground ${bg}`}
                        style={{ zIndex: 4 - i }}>
                        {["A", "M", "S", "K"][i]}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-primary-foreground/70">
                    <span className="font-bold text-primary-foreground">240+</span> booked this month
                  </p>
                </div>
              </div>

              {/* Detail rows */}
              <div className="divide-y divide-white/55 px-5">
                {[
                  { icon: <Stethoscope className="size-4" />, label: "Service", value: "General Consultation", badge: "30 min" },
                  { icon: <UserRound   className="size-4" />, label: "Doctor",  value: "To be assigned" },
                  { icon: <Clock       className="size-4" />, label: "Date",    value: "Thu 8 May · 10:30 AM" },
                ].map(({ icon, label, value, badge }) => (
                  <div key={label} className="flex items-center gap-3 py-3.5">
                    <div className={`${styles.iconWell} flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground`}>
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
                    </div>
                    {badge && (
                      <span className={`${styles.glassChip} shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-muted-foreground`}>
                        {badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Step progress */}
              <div className="border-t border-white/55 bg-white/26 px-5 py-3.5">
                <div className="flex items-center">
                  {["Service", "Date", "Details"].map((step, i) => (
                    <Fragment key={step}>
                      <div className="flex items-center gap-1.5">
                        <div className="flex size-5 items-center justify-center rounded-full text-[9px] font-black"
                          style={i < 2
                            ? { background: "var(--primary)", color: "var(--primary-foreground)" }
                            : { border: "1.5px solid var(--border)", color: "var(--muted-foreground)" }
                          }>
                          {i < 2 ? <Check className="size-2.5" strokeWidth={3} /> : 3}
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground">{step}</span>
                      </div>
                      {i < 2 && <div className="mx-2 h-px flex-1 bg-white/60" />}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* "Slots available" chip bottom-right */}
            <div className={`${styles.glassChip} absolute -bottom-4 -right-6 z-10 flex items-center gap-2 rounded-xl px-3 py-2`}>
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-50" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              <p className="text-[11px] font-semibold text-foreground">Slots available today</p>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  TRUST BAR                                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-2">
        {[
          "No account needed",
          "Free to book",
          "Instant email confirmation",
          "Cancel any time",
        ].map((t) => (
          <span key={t}
            className={`${styles.glassChip} inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground`}>
            <Check className="size-3 text-primary" strokeWidth={3} />
            {t}
          </span>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  HOW IT WORKS                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="pt-4">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Simple process</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">Book in 3 steps</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              num: "01",
              icon: <Stethoscope className="size-5" />,
              title: "Choose a service",
              desc: "Browse available services and select the one that fits your needs.",
            },
            {
              num: "02",
              icon: <CalendarDays className="size-5" />,
              title: "Pick a preferred date",
              desc: "Tell us when works best — we'll confirm your exact appointment time.",
            },
            {
              num: "03",
              icon: <Zap className="size-5" />,
              title: "Instant confirmation",
              desc: "Receive an email confirmation right away. No waiting, no phone calls.",
            },
          ].map(({ num, icon, title, desc }, i) => (
            <div key={i} className={`${styles.stepCard} ${styles.glassCard} relative overflow-hidden rounded-3xl p-6`}>
              {/* Ghost number for depth */}
              <p className="pointer-events-none absolute right-4 top-3 select-none text-7xl font-black leading-none text-white/65">
                {num}
              </p>
              <div className="relative">
                <div className={`${styles.iconWell} flex size-11 items-center justify-center rounded-2xl text-primary`}>
                  {icon}
                </div>
                <p className="mt-4 font-bold text-foreground">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  SERVICES                                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="services" className="scroll-mt-6 pt-4">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Services</p>
            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-foreground">
              What brings you in?
            </h2>
          </div>
          <Link href="/book"
            className="hidden items-center gap-1 text-xs font-semibold text-primary hover:underline sm:flex">
            Book now <ArrowRight className="size-3" />
          </Link>
        </div>

        {services.length === 0 ? (
          <div className={`${styles.glassCard} rounded-3xl p-8 text-center text-sm text-muted-foreground`}>
            No services listed yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {services.map((service) => (
              <Link key={service.id} href={`/book?serviceId=${service.id}`}
                className={`${styles.serviceCard} ${styles.glassCard} group relative flex flex-col overflow-hidden rounded-3xl p-4 hover:-translate-y-0.5 hover:border-primary/35`}>

                {/* Hover tint */}
                <div className="pointer-events-none absolute inset-0 bg-primary/0 transition-colors duration-200 group-hover:bg-primary/[0.04]" />

                <div className="relative flex items-center justify-between gap-2">
                  <div className={`${styles.iconWell} flex size-9 shrink-0 items-center justify-center rounded-2xl text-primary`}>
                    <Stethoscope className="size-4" />
                  </div>
                  <span className={`${styles.glassChip} inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground`}>
                    <Clock className="size-2.5" />
                    {service.durationMins}m
                  </span>
                </div>

                <p className="relative mt-3 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                  {service.name}
                </p>
                {service.description && (
                  <p className="relative mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                )}

                <div className="relative mt-auto flex items-center gap-1 pt-3 text-xs font-bold text-primary opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5">
                  Book now <ArrowRight className="size-3" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  BOTTOM CTA                                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className={`${styles.bottomCta} relative overflow-hidden rounded-[2rem] px-8 py-16 text-center`}>

        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/80" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-28 w-[34rem] -translate-x-1/2 rounded-full bg-white/36 blur-3xl" />

        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--primary)" }}>
            Get started
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
            style={{ color: "var(--foreground)" }}>
            Let&apos;s get you booked.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm"
            style={{ color: "var(--muted-foreground)" }}>
            No account needed. Takes under 3 minutes. Free to book.
          </p>
          <Link href="/book"
            className={`${styles.primaryButton} mt-8 inline-flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground transition-all duration-200 hover:-translate-y-px`}>
            Book appointment
            <ArrowRight className="size-4" />
          </Link>
          <p className="mt-4 text-[11px]"
            style={{ color: "var(--muted-foreground)" }}>
            Free · No account · Cancel any time
          </p>
        </div>
      </section>

    </div>
  )
}
