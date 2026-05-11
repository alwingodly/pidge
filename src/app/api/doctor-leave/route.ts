import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: "date must be YYYY-MM-DD" }
  const date = new Date(value + "T00:00:00.000Z")
  if (isNaN(date.getTime())) return { error: "Invalid date" }
  return { date }
}

// GET /api/doctor-leave?doctorId=xxx — list leave for a doctor
export const GET = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId } = getScopeFromSession(req.auth)
  const doctorId = new URL(req.url).searchParams.get("doctorId")
  if (!doctorId) return Response.json({ error: "doctorId required" }, { status: 400 })

  const leaves = await prisma.doctorLeave.findMany({
    where:   { tenantId, doctorId },
    orderBy: { startDate: "asc" },
  })

  return Response.json({ data: leaves })
})

// POST /api/doctor-leave — create a leave period
export const POST = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId } = getScopeFromSession(req.auth)

  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: "Invalid request" }, { status: 400 })

  const { doctorId, startDate: startRaw, endDate: endRaw, reason, period } = body

  if (!doctorId) return Response.json({ error: "doctorId required" }, { status: 400 })

  const validPeriods = ["FULL", "MORNING", "AFTERNOON"]
  const resolvedPeriod = validPeriods.includes(period) ? period : "FULL"

  const start = parseDateOnly(startRaw)
  const end   = parseDateOnly(endRaw ?? startRaw) // single day if no endDate
  if ("error" in start) return Response.json({ error: start.error }, { status: 400 })
  if ("error" in end)   return Response.json({ error: end.error },   { status: 400 })
  if (end.date < start.date) return Response.json({ error: "End date must be on or after start date" }, { status: 400 })

  // Verify doctor belongs to this tenant
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId, tenantId }, select: { id: true, name: true } })
  if (!doctor) return Response.json({ error: "Doctor not found" }, { status: 404 })

  const leave = await prisma.doctorLeave.create({
    data: { tenantId, doctorId, startDate: start.date, endDate: end.date, period: resolvedPeriod, reason: reason ?? null },
  })

  // Find affected appointments (approved/pending during the leave period)
  const affected = await prisma.appointment.count({
    where: {
      tenantId,
      doctorId,
      status: { in: ["PENDING", "APPROVED"] },
      OR: [
        { assignedDate: { gte: start.date, lte: end.date } },
        { preferredDate: { gte: start.date, lte: end.date } },
        { slot: { date: { gte: start.date, lte: end.date } } },
      ],
    },
  })

  return Response.json({ data: leave, affectedAppointments: affected }, { status: 201 })
})
