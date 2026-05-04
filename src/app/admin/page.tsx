import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import Link from "next/link"
import { formatDate, formatTime } from "@/lib/utils"
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  Stethoscope,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import {
  BookingTrendChart,
  StatusDonut,
  type StatusSlice,
  type TrendPoint,
} from "@/components/admin/AdminCharts"

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session) return null

  const { tenantId, branchId } = getScopeFromSession(session)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86_400_000)
  const weekStart = new Date(todayStart.getTime() - 7 * 86_400_000)
  const weekEnd = new Date(todayStart.getTime() + 7 * 86_400_000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(todayStart.getTime() - 29 * 86_400_000)
  const scope = { tenantId, branchId: branchId ?? undefined }

  const [
    todayTotal,
    pendingTotal,
    approvedToday,
    weekTotal,
    cancelledTotal,
    completedTotal,
    monthTotal,
    lastWeekTotal,
    approvedTotal,
    noShowTotal,
    allAppointments,
    todaySchedule,
    pendingQueue,
    recentBookings,
    doctors,
    services,
    trendRaw,
  ] = await Promise.all([
    prisma.appointment.count({ where: { ...scope, slot: { date: { gte: todayStart, lt: todayEnd } } } }),
    prisma.appointment.count({ where: { ...scope, status: "PENDING" } }),
    prisma.appointment.count({ where: { ...scope, status: "APPROVED", slot: { date: { gte: todayStart, lt: todayEnd } } } }),
    prisma.appointment.count({ where: { ...scope, slot: { date: { gte: todayStart, lt: weekEnd } } } }),
    prisma.appointment.count({ where: { ...scope, status: "CANCELLED" } }),
    prisma.appointment.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.appointment.count({ where: { ...scope, createdAt: { gte: monthStart } } }),
    prisma.appointment.count({ where: { ...scope, createdAt: { gte: weekStart, lt: todayStart } } }),
    prisma.appointment.count({ where: { ...scope, status: "APPROVED" } }),
    prisma.appointment.count({ where: { ...scope, status: "NO_SHOW" } }),
    prisma.appointment.count({ where: scope }),
    prisma.appointment.findMany({
      where: { ...scope, slot: { date: { gte: todayStart, lt: todayEnd } }, status: { not: "CANCELLED" } },
      include: { slot: true, service: true, doctor: true },
      orderBy: { slot: { startTime: "asc" } },
    }),
    prisma.appointment.findMany({
      where: { ...scope, status: "PENDING" },
      include: { slot: true, service: true, doctor: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.appointment.findMany({
      where: scope,
      include: { slot: true, service: true, doctor: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.doctor.findMany({
      where: { ...scope, isActive: true },
      include: { _count: { select: { appointments: true } } },
      orderBy: { appointments: { _count: "desc" } },
      take: 5,
    }),
    prisma.service.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { appointments: true } } },
      orderBy: { appointments: { _count: "desc" } },
      take: 5,
    }),
    prisma.appointment.findMany({
      where: { ...scope, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const completionRate = allAppointments > 0 ? Math.round((completedTotal / allAppointments) * 100) : 0
  const weekGrowth = lastWeekTotal > 0 ? Math.round(((weekTotal - lastWeekTotal) / lastWeekTotal) * 100) : null
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  const nextAppointment = todaySchedule.find((appt) => {
    if (appt.assignedTime) return true
    if (!appt.slot) return false
    return appt.slot.startTime >= currentTime
  }) ?? todaySchedule[0]

  const trendMap = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(todayStart.getTime() - i * 86_400_000)
    trendMap.set(date.toISOString().slice(0, 10), 0)
  }
  for (const appointment of trendRaw) {
    const key = appointment.createdAt.toISOString().slice(0, 10)
    trendMap.set(key, (trendMap.get(key) ?? 0) + 1)
  }

  const trendData: TrendPoint[] = Array.from(trendMap.entries()).map(([date, bookings]) => ({
    day: date.slice(5),
    bookings,
  }))

  const statusData: StatusSlice[] = [
    { name: "Pending", value: pendingTotal, color: "#D97706" },
    { name: "Approved", value: approvedTotal, color: "#059669" },
    { name: "Completed", value: completedTotal, color: "#3A8A97" },
    { name: "Cancelled", value: cancelledTotal, color: "#BF4646" },
    { name: "No Show", value: noShowTotal, color: "#8B735E" },
  ].filter((slice) => slice.value > 0)

  const topDoctors = doctors
    .filter((doctor) => doctor._count.appointments > 0)
    .map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      count: doctor._count.appointments,
    }))

  const topServices = services
    .filter((service) => service._count.appointments > 0)
    .map((service) => ({
      id: service.id,
      name: service.name,
      count: service._count.appointments,
    }))

  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{dateLabel}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Clinic desk</h1>
        </div>
        <Link
          href="/admin/appointments"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E8D8C5] bg-white px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
        >
          Open appointments <ArrowRight className="size-3.5" />
        </Link>
      </header>

      <section className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
          <div className="grid divide-y divide-[#F3EAE0] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <DeskMetric label="Today" value={todayTotal} helper="appointments" icon={CalendarDays} />
            <DeskMetric label="Pending" value={pendingTotal} helper="needs review" icon={Clock} attention={pendingTotal > 0} />
            <DeskMetric label="Confirmed" value={approvedToday} helper="today" icon={CheckCircle2} />
            <DeskMetric
              label="This week"
              value={weekTotal}
              helper={weekGrowth !== null ? `${weekGrowth >= 0 ? "+" : ""}${weekGrowth}% vs last week` : "scheduled"}
              icon={weekGrowth !== null && weekGrowth < 0 ? TrendingDown : TrendingUp}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#E8E3DC] bg-[#1C1007] p-4 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Next up</p>
          {nextAppointment ? (
            <Link href={`/admin/appointments/${nextAppointment.id}`} className="group mt-3 block">
              <p className="font-mono text-2xl font-bold">
                {nextAppointment.assignedTime ?? (nextAppointment.slot ? formatTime(nextAppointment.slot.startTime) : "--:--")}
              </p>
              <p className="mt-2 truncate text-sm font-semibold group-hover:text-[#F2C7C7]">{nextAppointment.patientName}</p>
              <p className="mt-0.5 truncate text-xs text-white/55">
                {nextAppointment.service.name}{nextAppointment.doctor ? ` · ${nextAppointment.doctor.name}` : ""}
              </p>
            </Link>
          ) : (
            <div className="mt-8">
              <p className="text-sm font-semibold">No appointments today</p>
              <p className="mt-1 text-xs text-white/55">The schedule is clear.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="Today&apos;s schedule"
          action={<span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">{todaySchedule.length} rows</span>}
        >
          {todaySchedule.length === 0 ? (
            <EmptyState text="No appointments scheduled for today." />
          ) : (
            <div className="divide-y divide-[#F3EAE0]">
              {todaySchedule.map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Needs attention"
          action={<Link href="/admin/appointments?status=PENDING" className="text-xs font-semibold text-primary hover:underline">Review all</Link>}
        >
          {pendingQueue.length === 0 ? (
            <EmptyState text="No pending requests right now." />
          ) : (
            <div className="divide-y divide-[#F3EAE0]">
              {pendingQueue.map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} compact />
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel
          title="Bookings over time"
          subtitle="Last 30 days"
          action={<span className="text-xs font-semibold text-muted-foreground">{monthTotal} this month</span>}
        >
          <div className="px-1 py-2">
            <BookingTrendChart data={trendData} />
          </div>
        </Panel>

        <Panel title="Quality signal" subtitle="All appointments">
          <div className="grid grid-cols-3 gap-2 border-b border-[#F3EAE0] px-4 py-3 text-center">
            <MiniStat label="Complete" value={`${completionRate}%`} />
            <MiniStat label="Cancelled" value={cancelledTotal} />
            <MiniStat label="No show" value={noShowTotal} />
          </div>
          <div className="flex min-h-52 items-center justify-center p-4">
            {statusData.length === 0 ? <EmptyState text="No status data yet." /> : <StatusDonut data={statusData} />}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recent bookings" action={<Link href="/admin/appointments" className="text-xs font-semibold text-primary hover:underline">View all</Link>}>
          {recentBookings.length === 0 ? (
            <EmptyState text="No bookings yet." />
          ) : (
            <div className="divide-y divide-[#F3EAE0]">
              {recentBookings.map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} compact />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Top doctors" icon={<Stethoscope className="size-4 text-muted-foreground" />}>
          <div>
            {topDoctors.length === 0
              ? <EmptyState text="No doctor data yet." />
              : <TopRankedList data={topDoctors} tone="primary" countLabel="appointments" />}
          </div>
        </Panel>

        <Panel title="Top services" icon={<Briefcase className="size-4 text-muted-foreground" />}>
          <div>
            {topServices.length === 0
              ? <EmptyState text="No service data yet." />
              : <TopRankedList data={topServices} tone="accent" countLabel="bookings" />}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function DeskMetric({
  label,
  value,
  helper,
  icon: Icon,
  attention,
}: {
  label: string
  value: number
  helper: string
  icon: React.ElementType
  attention?: boolean
}) {
  return (
    <div className="relative p-4">
      {attention && <span className="absolute right-3 top-3 size-2 rounded-full bg-amber-400" />}
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  action,
  icon,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[#F3EAE0] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function AppointmentRow({
  appointment,
  compact,
}: {
  appointment: {
    id: string
    patientName: string
    status: string
    assignedTime?: string | null
    assignedDate?: Date | null
    preferredDate?: Date | null
    slot?: { date: Date; startTime: string } | null
    service: { name: string }
    doctor?: { name: string } | null
  }
  compact?: boolean
}) {
  const time = appointment.assignedTime ?? (appointment.slot ? formatTime(appointment.slot.startTime) : "TBC")
  const date = appointment.assignedDate
    ? formatDate(appointment.assignedDate)
    : appointment.slot ? formatDate(appointment.slot.date)
    : appointment.preferredDate ? `${formatDate(appointment.preferredDate)} pref`
    : "Date TBC"

  return (
    <Link
      href={`/admin/appointments/${appointment.id}`}
      className="group grid gap-3 px-4 py-3 transition-colors hover:bg-secondary/30 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="font-mono text-xs font-semibold text-muted-foreground">{compact ? date : time}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">{appointment.patientName}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {compact ? time : date} · {appointment.service.name}{appointment.doctor ? ` · ${appointment.doctor.name}` : ""}
        </p>
      </div>
      <StatusPill status={appointment.status} />
    </Link>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function TopRankedList({
  data,
  tone,
  countLabel,
}: {
  data: { id: string; name: string; count: number }[]
  tone: "primary" | "accent"
  countLabel: string
}) {
  const max = Math.max(...data.map((item) => item.count), 1)
  const barClass = tone === "primary" ? "bg-primary/70" : "bg-accent/80"

  return (
    <div className="divide-y divide-[#F3EAE0]">
      {data.map((item, index) => (
        <div
          key={item.id}
          className="px-4 py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-5 shrink-0 text-center text-[11px] font-bold text-muted-foreground">
              {index + 1}
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" title={item.name}>
              {item.name}
            </p>
            <span
              className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-foreground"
              title={`${item.count} ${countLabel}`}
            >
              {item.count}
            </span>
          </div>
          <div className="ml-7 mt-1.5 h-1 overflow-hidden rounded-full bg-[#F3EAE0]">
            <div
              className={`h-full rounded-full ${barClass}`}
              style={{ width: `${Math.max((item.count / max) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{text}</p>
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-600 ring-red-200",
  COMPLETED: "bg-[#EAF3F5] text-[#3A8A97] ring-[#C5DFE4]",
  NO_SHOW: "bg-orange-50 text-orange-600 ring-orange-200",
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`w-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground ring-border"}`}>
      {status.replace("_", " ")}
    </span>
  )
}
