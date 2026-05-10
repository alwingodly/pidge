import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import AppointmentTable from "@/components/admin/AppointmentTable"
import NewAppointmentDialog from "@/components/admin/NewAppointmentDialog"
import { Prisma } from "@prisma/client"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

const PAGE_SIZE = 20

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
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

  const statusFilter   = sp.status   ?? "ALL"
  const dateFilter     = sp.date     ?? "ALL"
  const doctorIdFilter = sp.doctorId ?? "ALL"
  const serviceIdFilter = sp.serviceId ?? "ALL"
  const branchIdFilter = sp.branchId ?? "ALL"
  const query = (sp.q ?? "").trim()
  const page           = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  const conflictOnly   = sp.conflict === "true"

  const now        = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd   = new Date(todayStart.getTime() + 86_400_000)
  const weekEnd    = new Date(todayStart.getTime() + 7 * 86_400_000)

  // Fetch tenant first — needed for clinic hours in conflict query
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: {
      clinicStartTime: true,
      clinicEndTime: true,
      manualBookingEnabled: true,
      branchModeEnabled: true,
    },
  })

  const { clinicStartTime, clinicEndTime } = tenant ?? {}
  const branchFilter =
    tenant?.branchModeEnabled && !branchId && branchIdFilter !== "ALL"
      ? branchIdFilter
      : branchId ?? undefined

  const dateRange: { gte: Date; lt: Date } | undefined =
    dateFilter === "TODAY"    ? { gte: todayStart, lt: todayEnd } :
    dateFilter === "TOMORROW" ? { gte: todayEnd, lt: new Date(todayEnd.getTime() + 86_400_000) } :
    dateFilter === "WEEK"     ? { gte: todayStart, lt: weekEnd }  :
    undefined

  const andFilters: Prisma.AppointmentWhereInput[] = []
  if (query) {
    andFilters.push({
      OR: [
        { bookingRef: { contains: query, mode: "insensitive" } },
        { patientName: { contains: query, mode: "insensitive" } },
        { patientSurname: { contains: query, mode: "insensitive" } },
        { patientEmail: { contains: query, mode: "insensitive" } },
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
        { assignedTime: { gte: clinicEndTime  } },
      ],
    })
  } else if (conflictOnly) {
    andFilters.push({
      assignedDate: { gte: todayStart },
      assignedTime: { not: null },
    })
  }

  const where: Prisma.AppointmentWhereInput = {
    tenantId,
    branchId: branchFilter,
    status:   conflictOnly ? "APPROVED" : statusFilter !== "ALL" ? statusFilter : undefined,
    doctorId: doctorIdFilter !== "ALL" ? doctorIdFilter : undefined,
    serviceId: serviceIdFilter !== "ALL" ? serviceIdFilter : undefined,
    ...(andFilters.length ? { AND: andFilters } : {}),
  }

  const conflictWhere: Prisma.AppointmentWhereInput | null =
    clinicStartTime && clinicEndTime ? {
      tenantId,
      branchId:     branchFilter,
      status:       "APPROVED",
      assignedDate: { gte: todayStart },
      assignedTime: { not: null },
      OR: [
        { assignedTime: { lt: clinicStartTime } },
        { assignedTime: { gte: clinicEndTime  } },
      ],
    } : null

  const [appointments, total, doctors, services, branches, conflictCount] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include:  { slot: true, service: true, doctor: true, branch: true },
      orderBy:  { createdAt: "desc" },
      take:     PAGE_SIZE,
      skip:     (page - 1) * PAGE_SIZE,
    }),
    prisma.appointment.count({ where }),
    prisma.doctor.findMany({
      where:   { tenantId, branchId: branchId ?? undefined, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        branchId: true,
        doctorServices: { select: { serviceId: true } },
      },
    }),
    prisma.service.findMany({
      where:   { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select:  {
        id: true,
        name: true,
        durationMins: true,
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
    conflictWhere ? prisma.appointment.count({ where: conflictWhere }) : Promise.resolve(0),
  ])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Appointments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total} result{total !== 1 ? "s" : ""}
          </p>
        </div>
        {tenant?.manualBookingEnabled && (
          <NewAppointmentDialog
            services={services}
            doctors={doctors}
            branches={branches}
            branchModeEnabled={tenant.branchModeEnabled}
            defaultBranchId={branchId}
            clinicStartTime={clinicStartTime ?? null}
            clinicEndTime={clinicEndTime ?? null}
          />
        )}
      </div>

      {/* Conflict banner — shown when approved appointments fall outside clinic hours */}
      {!conflictOnly && conflictCount > 0 && (
        <Link
          href="/admin/appointments?conflict=true"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100"
        >
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {conflictCount} appointment{conflictCount !== 1 ? "s" : ""} conflict with current clinic hours
            </p>
            <p className="text-xs text-amber-700">
              These approved appointments are scheduled outside your opening hours — click to review and reschedule.
            </p>
          </div>
        </Link>
      )}

      {conflictOnly && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">
            Showing {total} appointment{total !== 1 ? "s" : ""} that conflict with clinic hours
          </p>
          <Link
            href="/admin/appointments"
            className="ml-auto shrink-0 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
          >
            Clear filter
          </Link>
        </div>
      )}

      <AppointmentTable
        appointments={appointments}
        doctors={doctors}
        services={services}
        branches={branches}
        filters={{
          status: statusFilter,
          date: dateFilter,
          doctorId: doctorIdFilter,
          serviceId: serviceIdFilter,
          branchId: branchIdFilter,
          q: query,
          page: String(page),
        }}
        total={total}
        pageSize={PAGE_SIZE}
        clinicStartTime={clinicStartTime ?? null}
        clinicEndTime={clinicEndTime   ?? null}
      />
    </div>
  )
}
