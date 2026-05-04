import { prisma } from "@/lib/db"
import { getTenantFromHeaders } from "@/lib/tenant"
import Link from "next/link"
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock,
  MapPin,
  Stethoscope,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Fragment } from "react"

export default async function BookingHomePage() {
  const { tenantId, branchId, tenantName } = await getTenantFromHeaders()

  if (!tenantId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
          <MapPin className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Clinic not found</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Visit your clinic&apos;s booking page at{" "}
          <span className="font-mono">clinicname.pikatym.io</span>.
        </p>
      </div>
    )
  }

  const services = await prisma.service.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
  })

  // branchId suppresses an unused-var warning — used for future filtering
  void branchId

  return (
    <div className="space-y-16 pb-8">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            <CalendarCheck className="size-3.5" />
            Book online · No waiting on hold
          </div>

          <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl">
            Book your visit with<br />
            <span className="text-primary">{tenantName || "your clinic"}</span>
          </h1>

          <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground">
            Choose your service, pick a preferred date, and confirm your appointment in minutes — all online, any time.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 rounded-xl px-7 font-semibold shadow-sm">
              <Link href="/book">
                Book appointment <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-xl border-[#E8D8C5] bg-white px-7 font-semibold hover:border-primary/40 hover:bg-secondary"
            >
              <Link href="#services">View services</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-muted-foreground">
            {[
              `${services.length} service${services.length !== 1 ? "s" : ""}`,
              "Available 24 / 7",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Booking confirmation preview */}
        <div className="relative hidden lg:block">
          <div className="overflow-hidden rounded-2xl border border-[#E8D8C5] bg-white shadow-xl">
            <div className="border-b border-[#E8D8C5] bg-linear-to-r from-secondary to-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
                  <CalendarCheck className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Booking confirmed</p>
                  <p className="text-xs text-muted-foreground">Ref #PD-2025-001 · Confirmation sent</p>
                </div>
                <div className="ml-auto flex size-7 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
                  <Check className="size-3.5 text-emerald-600" strokeWidth={3} />
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#F5ECE3] px-5">
              {[
                { icon: <Stethoscope className="size-4" />, label: "Service", value: "General Consultation", badge: "30 min" },
                { icon: <UserRound className="size-4" />, label: "Clinician", value: "To be assigned" },
                { icon: <Clock className="size-4" />, label: "Preferred date", value: "Thu 8 May" },
              ].map(({ icon, label, value, badge }) => (
                <div key={label} className="flex items-center gap-3 py-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="truncate text-sm font-semibold text-foreground">{value}</p>
                  </div>
                  {badge && (
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {badge}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-[#E8D8C5] bg-secondary/30 px-5 py-3.5">
              <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Done in 3 simple steps
              </p>
              <div className="flex items-center">
                {["Service", "Date", "Details"].map((step, i) => (
                  <Fragment key={step}>
                    <div className="flex items-center gap-1.5">
                      <div className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${i < 2 ? "bg-primary text-white" : "border border-[#E8D8C5] bg-white text-muted-foreground"}`}>
                        {i < 2 ? <Check className="size-3" strokeWidth={3} /> : 3}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{step}</span>
                    </div>
                    {i < 2 && <div className="mx-2 h-px flex-1 bg-[#E8D8C5]" />}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-6 -top-6 -z-10 size-36 rounded-full bg-primary/6 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-4 -left-4 -z-10 size-28 rounded-full bg-accent/10 blur-2xl" />
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────── */}
      <section id="services" className="scroll-mt-20">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Services</p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
            What brings you in today?
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
            Select a service to get started — our team will confirm your clinician and time by email.
          </p>
        </div>

        {services.length === 0 ? (
          <div className="rounded-2xl border border-[#E8D8C5] bg-white p-6 text-sm text-muted-foreground">
            No services listed yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/book?serviceId=${service.id}`}
                className="group flex flex-col rounded-2xl border border-[#E8D8C5] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Stethoscope className="size-4" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Clock className="size-2.5" />
                    {service.durationMins}m
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                  {service.name}
                </p>
                {service.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-1 pt-3 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Book <ArrowRight className="size-3" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
