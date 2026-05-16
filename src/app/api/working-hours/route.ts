import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

// GET /api/working-hours?doctorId=x  →  returns all days for that doctor
export const GET = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { tenantId } = getScopeFromSession(req.auth)
  const doctorId     = new URL(req.url).searchParams.get("doctorId")
  if (!doctorId) return Response.json({ error: "doctorId required" }, { status: 400 })

  const { branchId } = getScopeFromSession(req.auth)

  const [hours, tenant, branch] = await Promise.all([
    prisma.workingHours.findMany({
      where:   { tenantId, doctorId },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { clinicStartTime: true, clinicEndTime: true, slotIntervalMins: true, lunchBreakStart: true, lunchBreakEnd: true },
    }),
    branchId ? prisma.branch.findUnique({
      where:  { id: branchId, tenantId },
      select: { slotIntervalMins: true, lunchBreakStart: true, lunchBreakEnd: true },
    }) : Promise.resolve(null),
  ])

  // Branch overrides take precedence over tenant defaults
  const slotIntervalMins = branch?.slotIntervalMins ?? tenant?.slotIntervalMins ?? 30
  const lunchBreakStart  = branch?.lunchBreakStart  ?? tenant?.lunchBreakStart  ?? null
  const lunchBreakEnd    = branch?.lunchBreakEnd    ?? tenant?.lunchBreakEnd    ?? null

  return Response.json({
    data:            hours,
    clinicStartTime: tenant?.clinicStartTime ?? null,
    clinicEndTime:   tenant?.clinicEndTime   ?? null,
    slotIntervalMins,
    lunchBreakStart,
    lunchBreakEnd,
  })
})

const upsertSchema = z.object({
  doctorId: z.string().uuid(),
  schedule: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime:   z.string().regex(/^\d{2}:\d{2}$/),
    isActive:  z.boolean(),
  })),
})

// POST /api/working-hours  →  upsert full weekly schedule for a doctor
export const POST = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { tenantId, branchId } = getScopeFromSession(req.auth)

  const body   = await req.json()
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { doctorId, schedule } = parsed.data

  // Verify doctor belongs to this tenant (and branch for branch admins)
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId, tenantId, ...(branchId ? { branchId } : {}) },
    select: { id: true },
  })
  if (!doctor) return Response.json({ error: "Invalid clinician." }, { status: 400 })

  const rows = await prisma.$transaction(
    schedule.map(({ dayOfWeek, startTime, endTime, isActive }) =>
      prisma.workingHours.upsert({
        where:  { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
        create: { tenantId, branchId: branchId ?? undefined, doctorId, dayOfWeek, startTime, endTime, isActive },
        update: { startTime, endTime, isActive },
      })
    )
  )

  return Response.json({ data: rows })
})
