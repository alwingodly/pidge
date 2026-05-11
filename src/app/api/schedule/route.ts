import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"

function pad2(n: number) { return String(n).padStart(2, "0") }
function toDateStr(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { tenantId, branchId } = getScopeFromSession(session)
  const { searchParams }       = new URL(req.url)
  const start = searchParams.get("start") // "YYYY-MM-DD" Monday
  const end   = searchParams.get("end")   // "YYYY-MM-DD" Saturday

  if (!start || !end)
    return Response.json({ error: "Missing start/end" }, { status: 400 })

  const startDate = new Date(`${start}T00:00:00.000Z`)
  const endDate   = new Date(`${end}T23:59:59.999Z`)

  const [doctors, appointments, workingHours, branches, leaves] = await Promise.all([
    prisma.doctor.findMany({
      where:   { tenantId, branchId: branchId ?? undefined, isActive: true },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId,
        assignedDate: { gte: startDate, lte: endDate },
        assignedTime: { not: null },
        status:       { not: "CANCELLED" },
      },
      include: {
        service: { select: { name: true, durationMins: true } },
        doctor:  { select: { id: true, name: true } },
      },
    }),
    prisma.workingHours.findMany({ where: { tenantId, isActive: true } }),
    prisma.branch.findMany({
      where:   { tenantId, isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Doctor leave periods that overlap the requested date range
    prisma.doctorLeave.findMany({
      where: {
        tenantId,
        startDate: { lte: endDate },
        endDate:   { gte: startDate },
      },
      select: { doctorId: true, startDate: true, endDate: true, reason: true },
    }),
  ])

  return Response.json({
    doctors: doctors.map((d, i) => ({
      id:         d.id,
      name:       d.name,
      speciality: d.speciality,
      branchId:   d.branchId ?? null,
      branchName: d.branch?.name ?? null,
      colorIndex: i % 8,
    })),
    appointments: appointments
      .filter((a) => a.assignedDate && a.assignedTime)
      .map((a) => ({
        id:          a.id,
        bookingRef:  a.bookingRef,
        patientName: a.patientName,
        doctorId:    a.doctorId ?? "",
        date:        toDateStr(a.assignedDate!),
        time:        a.assignedTime!,
        duration:    a.service.durationMins,
        service:     a.service.name,
        status:      a.status,
      })),
    workingHours: workingHours.map((w) => ({
      doctorId:  w.doctorId,
      dayOfWeek: w.dayOfWeek,
      startTime: w.startTime,
      endTime:   w.endTime,
    })),
    leaves: leaves.map((l) => ({
      doctorId:  l.doctorId,
      startDate: toDateStr(l.startDate),
      endDate:   toDateStr(l.endDate),
      reason:    l.reason ?? null,
    })),
    branches,
  })
}
