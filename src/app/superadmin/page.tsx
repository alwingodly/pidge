import { prisma } from "@/lib/db"
import Link from "next/link"
import { Building2, CalendarDays, TrendingUp, CheckCircle, Clock, XCircle } from "lucide-react"

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
    approvedBookings,
    cancelledBookings,
    recentTenants,
    topTenants,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.tenant.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.appointment.count({ where: { status: "APPROVED" } }),
    prisma.appointment.count({ where: { status: "CANCELLED" } }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { appointments: true, doctors: true } } },
    }),
    prisma.tenant.findMany({
      where: { isActive: true },
      include: { _count: { select: { appointments: true } } },
      orderBy: { appointments: { _count: "desc" } },
      take: 5,
    }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">All tenants · All time</p>
      </div>

      {/* Tenant stats */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tenants</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={Building2}   color="primary" label="Total Tenants"  value={totalTenants} />
          <StatCard icon={CheckCircle} color="accent"  label="Active Tenants" value={activeTenants} />
          <StatCard icon={TrendingUp}  color="primary" label="New This Month" value={newTenantsThisMonth} />
        </div>
      </section>

      {/* Booking stats */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bookings</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={CalendarDays} color="primary" label="Total Bookings" value={totalBookings} />
          <StatCard icon={TrendingUp}   color="accent"  label="This Week"      value={bookingsThisWeek} />
          <StatCard icon={Clock}        color="accent"  label="Pending"        value={pendingBookings} />
          <StatCard icon={CheckCircle}  color="accent"  label="Approved"       value={approvedBookings} />
          <StatCard icon={XCircle}      color="primary" label="Cancelled"      value={cancelledBookings} />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent tenants */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Tenants</h2>
            <Link href="/superadmin/tenants" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentTenants.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No tenants yet.</p>
            ) : recentTenants.map((t) => (
              <Link key={t.id} href={`/superadmin/tenants/${t.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-secondary transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.slug}.pikatym.io · {t._count.doctors} doctors</p>
                </div>
                <div className="text-right">
                  <PlanBadge plan={t.plan} />
                  <p className="text-xs text-muted-foreground mt-1">{t._count.appointments} bookings</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Most active tenants */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Most Active Clinics</h2>
          </div>
          <div className="divide-y divide-border">
            {topTenants.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No data yet.</p>
            ) : topTenants.map((t, i) => (
              <Link key={t.id} href={`/superadmin/tenants/${t.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-secondary transition-colors">
                <span className="text-lg font-bold text-muted-foreground/40 w-6">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.slug}.pikatym.io</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{t._count.appointments} bookings</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const COLOR_MAP: Record<string, { bg: string; icon: string }> = {
  primary: { bg: "bg-secondary",  icon: "text-primary" },
  accent:  { bg: "bg-[#EAF3F5]",  icon: "text-accent" },
}

function StatCard({ icon: Icon, color, label, value }: {
  icon: React.ElementType; color: string; label: string; value: number
}) {
  const { bg, icon } = COLOR_MAP[color] ?? COLOR_MAP.primary
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${icon}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    FREE:  "bg-muted text-muted-foreground",
    BASIC: "bg-secondary text-primary",
    PRO:   "bg-[#EAF3F5] text-accent",
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[plan] ?? "bg-muted text-muted-foreground"}`}>
      {plan}
    </span>
  )
}
