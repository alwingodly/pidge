import { prisma } from "@/lib/db"
import Link from "next/link"

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
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-semibold text-foreground">Platform</h1>
        <p className="text-xs text-muted-foreground">System-wide overview</p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-border border border-border rounded-lg bg-card overflow-hidden">
        <Stat label="Tenants"   value={totalTenants} />
        <Stat label="Active"    value={activeTenants} />
        <Stat label="New / mo"  value={newTenantsThisMonth} />
        <Stat label="Bookings"  value={totalBookings} />
        <Stat label="This week" value={bookingsThisWeek} />
        <Stat label="Pending"   value={pendingBookings} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent tenants */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent</span>
            <Link href="/superadmin/tenants" className="text-xs text-primary hover:underline">All →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentTenants.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-muted-foreground">No tenants yet.</p>
            ) : recentTenants.map((t) => (
              <Link key={t.id} href={`/superadmin/tenants/${t.id}`}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.slug} · {t._count.doctors} dr</p>
                </div>
                <div className="shrink-0 text-right ml-3">
                  <p className="text-xs font-medium text-muted-foreground">{t.plan}</p>
                  <p className="text-xs text-muted-foreground">{t._count.appointments} bk</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top clinics */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Clinics</span>
          </div>
          <div className="divide-y divide-border">
            {topTenants.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-muted-foreground">No data yet.</p>
            ) : topTenants.map((t, i) => (
              <Link key={t.id} href={`/superadmin/tenants/${t.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.slug}</p>
                </div>
                <span className="text-sm font-semibold text-foreground shrink-0">{t._count.appointments}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-3 bg-card">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
