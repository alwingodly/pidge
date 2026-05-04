import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import AppointmentTable from "@/components/admin/AppointmentTable"

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string; doctorId?: string }>
}) {
  const session = await auth()
  if (!session) return null
  const { tenantId, branchId } = getScopeFromSession(session)
  const sp = await searchParams

  const statusFilter   = sp.status   ?? "ALL"
  const dateFilter     = sp.date     ?? "ALL"
  const doctorIdFilter = sp.doctorId ?? "ALL"

  const now       = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd   = new Date(todayStart.getTime() + 86400000)
  const weekEnd    = new Date(todayStart.getTime() + 7 * 86400000)

  const dateWhere =
    dateFilter === "TODAY" ? { gte: todayStart, lt: todayEnd } :
    dateFilter === "WEEK"  ? { gte: todayStart, lt: weekEnd }  :
    undefined

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      branchId: branchId ?? undefined,
      status:   statusFilter !== "ALL" ? statusFilter : undefined,
      slot:     dateWhere ? { date: dateWhere } : undefined,
      doctorId: doctorIdFilter !== "ALL" ? doctorIdFilter : undefined,
    },
    include: { slot: true, service: true, doctor: true, branch: true },
    // patientSurname is a scalar — automatically included by findMany
    orderBy: { createdAt: "desc" },
  })

  const doctors = await prisma.doctor.findMany({
    where: { tenantId, branchId: branchId ?? undefined, isActive: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Appointments</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {appointments.length} result{appointments.length !== 1 ? "s" : ""}
        </p>
      </div>
      <AppointmentTable
        appointments={appointments}
        doctors={doctors}
        filters={{ status: statusFilter, date: dateFilter, doctorId: doctorIdFilter }}
      />
    </div>
  )
}
