import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

// GET /api/working-hours?doctorId=x  →  returns all days for that doctor
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId } = getScopeFromSession(session)

  const doctorId = new URL(req.url).searchParams.get("doctorId")
  if (!doctorId) return Response.json({ error: "doctorId required" }, { status: 400 })

  const hours = await prisma.workingHours.findMany({
    where:   { tenantId, doctorId },
    orderBy: { dayOfWeek: "asc" },
  })
  return Response.json({ data: hours })
}

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
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(session)

  const body   = await req.json()
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { doctorId, schedule } = parsed.data

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
}
