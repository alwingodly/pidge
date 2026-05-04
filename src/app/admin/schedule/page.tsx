import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import DayScheduleView from "@/components/admin/DayScheduleView"

export default async function SchedulePage() {
  const session = await auth()
  if (!session) return null
  const { tenantId, branchId } = getScopeFromSession(session)

  const today = new Date()
  const dayOfWeek = today.getDay()

  const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`

  const todayLabel = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const [doctors, workingHours, todayAppts, branches] = await Promise.all([
    prisma.doctor.findMany({
      where: { tenantId, branchId: branchId ?? undefined, isActive: true },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.workingHours.findMany({
      where: { tenantId, dayOfWeek, isActive: true },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId,
        assignedDate: {
          gte: new Date(`${todayStr}T00:00:00.000Z`),
          lte: new Date(`${todayStr}T23:59:59.999Z`),
        },
        assignedTime: { not: null },
        status: { not: "CANCELLED" },
      },
      include: { service: { select: { name: true, durationMins: true } } },
    }),
    prisma.branch.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  const filteredAppts = todayAppts // assignedTime: { not: null } already filtered in DB

  const doctorSchedules = doctors.map((doc) => {
    const wh = workingHours.find((w) => w.doctorId === doc.id)
    return {
      id: doc.id,
      name: doc.name,
      speciality: doc.speciality,
      branchId: doc.branchId ?? null,
      branchName: doc.branch?.name ?? null,
      workingHours: wh ? { startTime: wh.startTime, endTime: wh.endTime } : null,
      appointments: filteredAppts
        .filter((a) => a.doctorId === doc.id)
        .map((a) => ({
          id: a.id,
          bookingRef: a.bookingRef,
          patientName: a.patientName,
          assignedTime: a.assignedTime!,
          durationMins: a.service.durationMins,
          serviceName: a.service.name,
        })),
    }
  })

  const isTenantAdmin = session.user.role === "TENANT_ADMIN"

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Schedule</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          View today&apos;s activity and manage each doctor&apos;s weekly working hours.
        </p>
      </div>

      <DayScheduleView
        doctors={doctorSchedules}
        branches={branches}
        todayLabel={todayLabel}
        isTenantAdmin={isTenantAdmin}
      />

    </div>
  )
}
