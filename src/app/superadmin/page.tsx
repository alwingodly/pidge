import { prisma } from "@/lib/db"
import Link from "next/link"
import type { ComponentType } from "react"
import { ArrowRight, Building2, CalendarCheck2, Clock3, Plus, TrendingUp, UsersRound } from "lucide-react"

export default async function SuperAdminDashboard() {
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart  = new Date(now.getTime() - 7 * 86_400_000)

  const [
    totalTenants,
    activeTenants,
    newTenantsThisMonth,
    totalBookings,
    bookingsThisWeek,
    pendingBookings,
    recentTenants,
    topTenants,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.tenant.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { _count: { select: { appointments: true, doctors: true } } },
    }),
    prisma.tenant.findMany({
      where: { isActive: true },
      include: { _count: { select: { appointments: true } } },
      orderBy: { appointments: { _count: "desc" } },
      take: 6,
    }),
  ])

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Outrift console</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">Platform overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tenants, bookings, and operational attention in one compact view.
            </p>
          </div>

          <Link
            href="/superadmin/tenants/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[#2F7FC1]"
          >
            <Plus className="size-3.5" />
            Tenant
          </Link>
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat icon={Building2} label="Tenants"   value={totalTenants} />
        <Stat icon={UsersRound} label="Active"    value={activeTenants} />
        <Stat icon={TrendingUp} label="New / mo"  value={newTenantsThisMonth} />
        <Stat icon={CalendarCheck2} label="Bookings"  value={totalBookings} />
        <Stat icon={TrendingUp} label="This week" value={bookingsThisWeek} />
        <Stat icon={Clock3} label="Pending"   value={pendingBookings} attention={pendingBookings > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent tenants</span>
              <p className="mt-0.5 text-sm font-semibold text-foreground">Newest workspaces</p>
            </div>
            <Link href="/superadmin/tenants" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentTenants.length === 0 ? (
              <p className="px-4 py-7 text-center text-sm text-muted-foreground">No tenants yet.</p>
            ) : recentTenants.map((t) => (
              <Link key={t.id} href={`/superadmin/tenants/${t.id}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-[11px] font-bold text-primary">
                    {t.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.slug} · {t._count.doctors} practitioners</p>
                  </div>
                </div>
                <div className="shrink-0 text-right ml-3">
                  <p className="text-[11px] font-semibold text-foreground">{t.plan}</p>
                  <p className="text-[11px] text-muted-foreground">{t._count.appointments} bookings</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Top clinics</span>
            <p className="mt-0.5 text-sm font-semibold text-foreground">By booking volume</p>
          </div>
          <div className="divide-y divide-border">
            {topTenants.length === 0 ? (
              <p className="px-4 py-7 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : topTenants.map((t, i) => (
              <Link key={t.id} href={`/superadmin/tenants/${t.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] font-bold text-primary">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.slug}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                  {t._count.appointments}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  attention = false,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
  attention?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex size-8 items-center justify-center rounded-lg ${attention ? "bg-[#FFC12B]/25 text-[#9A6B00]" : "bg-secondary text-primary"}`}>
          <Icon className="size-3.5" />
        </div>
        {attention && <span className="size-2 rounded-full bg-[#FFC12B]" />}
      </div>
      <p className="mt-3 text-xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </div>
  )
}
