import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import AppointmentTable from "@/components/admin/AppointmentTable"
import NewAppointmentDialog from "@/components/admin/NewAppointmentDialog"
import RequestsQueue from "@/components/admin/RequestsQueue"
import TodaySchedule from "@/components/admin/TodaySchedule"
import { Prisma } from "@prisma/client"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

const PAGE_SIZE = 20

type Tab = "requests" | "today" | "all"

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string
    status?: string
    date?: string
    doctorId?: string
    serviceId?: string
    branchId?: string
    q?: string
    page?: string
    conflict?: string
  }>
}) {
  const session = await auth()
  if (!session) return null
  const { tenantId, branchId } = getScopeFromSession(session)
  const sp = await searchParams

  const tab: Tab = (sp.tab === "today" || sp.tab === "all") ? sp.tab : "requests"

  const statusFilter    = sp.status    ?? "ALL"
  const dateFilter      = sp.date      ?? "ALL"
  const doctorIdFilter  = sp.doctorId  ?? "ALL"
  const serviceIdFilter = sp.serviceId ?? "ALL"
  const branchIdFilter  = sp.branchId  ?? "ALL"
  const query           = (sp.q ?? "").trim()
  const page            = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  const conflictOnly    = sp.conflict === "true"

  const now        = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd   = new Date(todayStart.getTime() + 86_400_000)
  const weekEnd    = new Date(todayStart.getTime() + 7 * 86_400_000)

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: {
      clinicStartTime:      true,
      clinicEndTime:        true,
      manualBookingEnabled: true,
      recurrenceEnabled:    true,
      branchModeEnabled:    true,
    },
  })

  const { clinicStartTime, clinicEndTime } = tenant ?? {}
  const branchFilter =
    tenant?.branchModeEnabled && !branchId && branchIdFilter !== "ALL"
      ? branchIdFilter
      : branchId ?? undefined

  // ── Shared lookups ─────────────────────────────────────────────────────────
  // Upcoming leave periods — to check if any approved appointments clash
  const upcomingLeaves = await prisma.doctorLeave.findMany({
    where: { tenantId, endDate: { gte: todayStart } },
    select: { doctorId: true, startDate: true, endDate: true },
  })

  // Count approved appointments that fall during a doctor's leave
  let leaveConflictCount = 0
  if (upcomingLeaves.length > 0) {
    const checks = await Promise.all(
      upcomingLeaves.map(l =>
        prisma.appointment.count({
          where: {
            tenantId,
            branchId: branchFilter,
            doctorId: l.doctorId,
            status:   { in: ["PENDING", "APPROVED"] },
            OR: [
              { assignedDate:  { gte: l.startDate, lte: l.endDate } },
              { slot: { date: { gte: l.startDate, lte: l.endDate } } },
            ],
          },
        })
      )
    )
    leaveConflictCount = checks.reduce((a, b) => a + b, 0)
  }

  const [doctors, services, branches] = await Promise.all([
    prisma.doctor.findMany({
      where:   { tenantId, branchId: branchId ?? undefined, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, branchId: true,
        doctorServices: { select: { serviceId: true } },
      },
    }),
    prisma.service.findMany({
      where:   { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, durationMins: true,
        branchConfigs: { select: { branchId: true, isOffered: true, isAvailable: true } },
      },
    }),
    tenant?.branchModeEnabled && !branchId
      ? prisma.branch.findMany({
          where:   { tenantId, isActive: true },
          orderBy: { name: "asc" },
          select:  { id: true, name: true },
        })
      : Promise.resolve([]),
  ])

  // ── Tab: Requests ──────────────────────────────────────────────────────────
  if (tab === "requests") {
    const [requests, requestsCount, todayCount] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          tenantId,
          branchId: branchFilter,
          status:   { in: ["PENDING", "CHECKED_IN"] },
        },
        include:  { slot: true, service: true, doctor: true, branch: true },
        orderBy:  { createdAt: "asc" }, // oldest first — longest wait at top
      }),
      prisma.appointment.count({
        where: { tenantId, branchId: branchFilter, status: { in: ["PENDING", "CHECKED_IN"] } },
      }),
      prisma.appointment.count({
        where: {
          tenantId,
          branchId: branchFilter,
          status: { notIn: ["CANCELLED"] },
          OR: [
            { assignedDate:  { gte: todayStart, lt: todayEnd } },
            { slot: { date: { gte: todayStart, lt: todayEnd } } },
          ],
        },
      }),
    ])

    return (
      <PageShell
        tab={tab}
        requestsCount={requestsCount}
        todayCount={todayCount}
        leaveConflictCount={leaveConflictCount}
        tenant={tenant}
        services={services}
        doctors={doctors}
        branches={branches}
        branchId={branchId}
        clinicStartTime={clinicStartTime ?? null}
        clinicEndTime={clinicEndTime ?? null}
      >
        <RequestsQueue
          appointments={requests}
          doctors={doctors}
          services={services}
          branches={branches}
        />
      </PageShell>
    )
  }

  // ── Tab: Today ─────────────────────────────────────────────────────────────
  if (tab === "today") {
    const [todayAppts, requestsCount, todayCount] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          tenantId,
          branchId: branchFilter,
          status:   { notIn: ["CANCELLED"] },
          OR: [
            { assignedDate:  { gte: todayStart, lt: todayEnd } },
            { slot: { date: { gte: todayStart, lt: todayEnd } } },
            // Also show CHECKED_IN walk-ins (no assigned date yet)
            { status: "CHECKED_IN" },
          ],
        },
        include:  { slot: true, service: true, doctor: true, branch: true },
        orderBy:  [{ assignedTime: "asc" }, { createdAt: "asc" }],
      }),
      prisma.appointment.count({
        where: { tenantId, branchId: branchFilter, status: { in: ["PENDING", "CHECKED_IN"] } },
      }),
      prisma.appointment.count({
        where: {
          tenantId,
          branchId: branchFilter,
          status: { notIn: ["CANCELLED"] },
          OR: [
            { assignedDate:  { gte: todayStart, lt: todayEnd } },
            { slot: { date: { gte: todayStart, lt: todayEnd } } },
          ],
        },
      }),
    ])

    return (
      <PageShell
        tab={tab}
        requestsCount={requestsCount}
        todayCount={todayCount}
        leaveConflictCount={leaveConflictCount}
        tenant={tenant}
        services={services}
        doctors={doctors}
        branches={branches}
        branchId={branchId}
        clinicStartTime={clinicStartTime ?? null}
        clinicEndTime={clinicEndTime ?? null}
      >
        <TodaySchedule
          appointments={todayAppts}
          doctors={doctors}
          services={services}
          branches={branches}
        />
      </PageShell>
    )
  }

  // ── Tab: All (existing table) ──────────────────────────────────────────────
  const dateRange: { gte: Date; lt: Date } | undefined =
    dateFilter === "TODAY"    ? { gte: todayStart, lt: todayEnd } :
    dateFilter === "TOMORROW" ? { gte: todayEnd,   lt: new Date(todayEnd.getTime() + 86_400_000) } :
    dateFilter === "WEEK"     ? { gte: todayStart, lt: weekEnd }  :
    undefined

  const andFilters: Prisma.AppointmentWhereInput[] = []
  if (query) {
    andFilters.push({
      OR: [
        { bookingRef:      { contains: query, mode: "insensitive" } },
        { patientName:     { contains: query, mode: "insensitive" } },
        { patientSurname:  { contains: query, mode: "insensitive" } },
        { patientEmail:    { contains: query, mode: "insensitive" } },
      ],
    })
  }
  if (dateRange && !conflictOnly) {
    andFilters.push({
      OR: [
        { assignedDate:  dateRange },
        { slot: { date: dateRange } },
        { preferredDate: dateRange },
      ],
    })
  }
  if (conflictOnly && clinicStartTime && clinicEndTime) {
    andFilters.push({
      assignedDate: { gte: todayStart },
      assignedTime: { not: null },
      OR: [
        { assignedTime: { lt: clinicStartTime } },
        { assignedTime: { gt: clinicEndTime } },
      ],
    })
  } else if (conflictOnly) {
    andFilters.push({ assignedDate: { gte: todayStart }, assignedTime: { not: null } })
  }

  const statusWhere: Prisma.AppointmentWhereInput["status"] =
    conflictOnly           ? "APPROVED"                             :
    statusFilter === "ALL" ? undefined                              :
    statusFilter === "PENDING" ? { in: ["PENDING", "CHECKED_IN"] } :
    statusFilter

  const where: Prisma.AppointmentWhereInput = {
    tenantId,
    branchId:  branchFilter,
    status:    statusWhere,
    doctorId:  doctorIdFilter  !== "ALL" ? doctorIdFilter  : undefined,
    serviceId: serviceIdFilter !== "ALL" ? serviceIdFilter : undefined,
    ...(andFilters.length ? { AND: andFilters } : {}),
  }

  const conflictWhere: Prisma.AppointmentWhereInput | null =
    clinicStartTime && clinicEndTime ? {
      tenantId, branchId: branchFilter, status: "APPROVED",
      assignedDate: { gte: todayStart }, assignedTime: { not: null },
      OR: [
        { assignedTime: { lt: clinicStartTime } },
        { assignedTime: { gt: clinicEndTime } },
      ],
    } : null

  const [appointments, total, requestsCount, todayCount, conflictCount] = await Promise.all([
    prisma.appointment.findMany({
      where, include: { slot: true, service: true, doctor: true, branch: true },
      orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.appointment.count({ where }),
    prisma.appointment.count({
      where: { tenantId, branchId: branchFilter, status: { in: ["PENDING", "CHECKED_IN"] } },
    }),
    prisma.appointment.count({
      where: {
        tenantId, branchId: branchFilter, status: { notIn: ["CANCELLED"] },
        OR: [
          { assignedDate:  { gte: todayStart, lt: todayEnd } },
          { slot: { date: { gte: todayStart, lt: todayEnd } } },
        ],
      },
    }),
    conflictWhere ? prisma.appointment.count({ where: conflictWhere }) : Promise.resolve(0),
  ])

  return (
    <PageShell
      tab={tab}
      requestsCount={requestsCount}
      todayCount={todayCount}
      leaveConflictCount={leaveConflictCount}
      tenant={tenant}
      services={services}
      doctors={doctors}
      branches={branches}
      branchId={branchId}
      clinicStartTime={clinicStartTime ?? null}
      clinicEndTime={clinicEndTime ?? null}
    >
      {!conflictOnly && conflictCount > 0 && (
        <Link
          href="/admin/appointments?tab=all&conflict=true"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100"
        >
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {conflictCount} appointment{conflictCount !== 1 ? "s" : ""} conflict with clinic hours
            </p>
            <p className="text-xs text-amber-700">Click to review appointments outside opening hours.</p>
          </div>
        </Link>
      )}
      {conflictOnly && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">
            Showing {total} appointment{total !== 1 ? "s" : ""} conflicting with clinic hours
          </p>
          <Link href="/admin/appointments?tab=all" className="ml-auto shrink-0 text-xs font-semibold text-amber-700 underline underline-offset-2">
            Clear
          </Link>
        </div>
      )}
      <AppointmentTable
        appointments={appointments}
        doctors={doctors}
        services={services}
        branches={branches}
        filters={{ status: statusFilter, date: dateFilter, doctorId: doctorIdFilter, serviceId: serviceIdFilter, branchId: branchIdFilter, q: query, page: String(page) }}
        total={total}
        pageSize={PAGE_SIZE}
        clinicStartTime={clinicStartTime ?? null}
        clinicEndTime={clinicEndTime ?? null}
      />
    </PageShell>
  )
}

// ── Shared page shell with tab nav ──────────────────────────────────────────

function PageShell({
  tab, requestsCount, todayCount, leaveConflictCount, tenant, services, doctors, branches, branchId,
  clinicStartTime, clinicEndTime, children,
}: {
  tab:                Tab
  requestsCount:      number
  todayCount:         number
  leaveConflictCount: number
  tenant:             { manualBookingEnabled: boolean | null; recurrenceEnabled: boolean | null; branchModeEnabled: boolean | null } | null
  services:           { id: string; name: string; durationMins: number; branchConfigs: { branchId: string; isOffered: boolean; isAvailable: boolean }[] }[]
  doctors:            { id: string; name: string; branchId: string | null; doctorServices: { serviceId: string }[] }[]
  branches:           { id: string; name: string }[]
  branchId?:          string | null
  clinicStartTime?:   string | null
  clinicEndTime?:     string | null
  children:           React.ReactNode
}) {
  const tabs = [
    { key: "requests", label: "Requests", count: requestsCount, urgent: requestsCount > 0 },
    { key: "today",    label: "Today",    count: todayCount,    urgent: false },
    { key: "all",      label: "All",      count: null,          urgent: false },
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-foreground">Appointments</h1>
        {tenant?.manualBookingEnabled && (
          <NewAppointmentDialog
            services={services}
            doctors={doctors}
            branches={branches}
            branchModeEnabled={!!tenant.branchModeEnabled}
            recurrenceEnabled={!!tenant.recurrenceEnabled}
            defaultBranchId={branchId}
            clinicStartTime={clinicStartTime ?? null}
            clinicEndTime={clinicEndTime ?? null}
          />
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/admin/appointments?tab=${t.key}`}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== null && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                t.urgent
                  ? "bg-amber-100 text-amber-700"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Leave conflict banner */}
      {leaveConflictCount > 0 && (
        <Link
          href="/admin/doctors"
          className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 transition-colors hover:bg-rose-100"
        >
          <AlertTriangle className="size-4 shrink-0 text-rose-600" />
          <p className="text-sm text-rose-800">
            <span className="font-semibold">{leaveConflictCount} appointment{leaveConflictCount !== 1 ? "s" : ""}</span>{" "}
            clash with a doctor&apos;s scheduled leave — review and reassign.
          </p>
        </Link>
      )}

      {children}
    </div>
  )
}
