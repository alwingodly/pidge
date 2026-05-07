import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getTenantFromHeaders, getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

// ── GET — patient-facing: available slots for a doctor+date+service ───────────
export async function GET(req: NextRequest) {
  const { tenantId, branchId } = await getTenantFromHeaders()
  const { searchParams }       = new URL(req.url)
  const doctorId  = searchParams.get("doctorId")
  const serviceId = searchParams.get("serviceId")
  const date      = searchParams.get("date")

  if (!tenantId) return Response.json({ error: "Tenant not found" }, { status: 404 })
  if (!date)     return Response.json({ error: "date is required" }, { status: 400 })

  const isAny = !doctorId || doctorId === "any"

  const slots = await prisma.slot.findMany({
    where: {
      tenantId,
      branchId: branchId ?? undefined,
      isBooked: false,
      date:     new Date(date),
      // Specific doctor or "any"
      ...(isAny ? {} : { doctorId }),
      // When "any" + serviceId: only doctors who offer that service
      ...(isAny && serviceId
        ? { doctor: { doctorServices: { some: { serviceId } } } }
        : {}),
      // Match slot's own serviceId (new slot model)
      // Slots without serviceId (legacy) are visible to all
      ...(serviceId
        ? { OR: [{ serviceId }, { serviceId: null }] }
        : {}),
    },
    include: { doctor: true },
    orderBy: { startTime: "asc" },
  })

  return Response.json({ data: slots })
}

// ── POST — admin: create slots for a doctor+date+service ─────────────────────
const HH_MM = /^\d{2}:\d{2}$/

const createSchema = z.object({
  doctorId:     z.string().uuid(),
  serviceId:    z.string().uuid().optional(),
  durationMins: z.number().int().positive().optional(),
  date:         z.string().min(1),
  times:        z.array(z.string().regex(HH_MM, "Each time must be HH:mm")).min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(session)

  const body   = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { doctorId, serviceId, durationMins: bodyDuration, date, times } = parsed.data

  // Validate date
  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) return Response.json({ error: "Invalid date." }, { status: 400 })

  // Verify doctor belongs to this tenant (and branch for branch admins)
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId, tenantId, ...(branchId ? { branchId } : {}) },
    select: { id: true },
  })
  if (!doctor) return Response.json({ error: "Invalid clinician." }, { status: 400 })

  // Verify serviceId belongs to this tenant
  let duration = bodyDuration ?? 30
  if (serviceId) {
    const svc = await prisma.service.findUnique({ where: { id: serviceId, tenantId }, select: { durationMins: true } })
    if (!svc) return Response.json({ error: "Invalid service." }, { status: 400 })
    if (!bodyDuration) duration = svc.durationMins
  }

  const slots = await prisma.$transaction(
    times.map((time) => {
      const [h, m]  = time.split(":").map(Number)
      const totalMin = h * 60 + m + duration
      const endHour  = Math.floor(totalMin / 60)
      const endMin   = totalMin % 60
      const endTime  = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`

      return prisma.slot.create({
        data: {
          tenantId,
          branchId:    branchId ?? undefined,
          doctorId,
          serviceId:   serviceId ?? null,
          durationMins: duration,
          date:        parsedDate,
          startTime:   time,
          endTime,
        },
      })
    })
  )

  return Response.json({ data: slots }, { status: 201 })
}
