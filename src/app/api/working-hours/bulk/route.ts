import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

const bulkSchema = z.object({
  // Optional: tenant admin can scope to a specific branch. Branch admin ignores this.
  targetBranchId: z.string().uuid().nullable().optional(),
  schedule: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime:   z.string().regex(/^\d{2}:\d{2}$/),
    isActive:  z.boolean(),
  })),
})

// POST /api/working-hours/bulk
// Applies a weekly schedule to all active doctors scoped by role + optional branch.
export const POST = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { tenantId, branchId: sessionBranchId } = getScopeFromSession(req.auth)
  const role = req.auth.user.role

  const isTenantAdmin = role === "TENANT_ADMIN"
  const isBranchAdmin = role === "BRANCH_ADMIN"

  if (!isTenantAdmin && !isBranchAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { targetBranchId, schedule } = parsed.data

  // Resolve the effective branch filter:
  // - Branch admins are always scoped to their branch (sessionBranchId)
  // - Tenant admins can pass targetBranchId to scope, or null to apply to ALL
  const effectiveBranchId: string | null | undefined =
    isBranchAdmin    ? sessionBranchId          // branch admin: always their branch
    : targetBranchId ? targetBranchId           // tenant admin targeting a branch
    : undefined                                 // tenant admin: all branches

  const doctors = await prisma.doctor.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    },
    select: { id: true },
  })

  if (doctors.length === 0) {
    return Response.json({ data: { updatedDoctors: 0 } })
  }

  const doctorIds = doctors.map(d => d.id)

  // Delete + recreate is far faster than N×7 individual upserts
  await prisma.$transaction([
    prisma.workingHours.deleteMany({
      where: { doctorId: { in: doctorIds } },
    }),
    prisma.workingHours.createMany({
      data: doctorIds.flatMap(doctorId =>
        schedule.map(({ dayOfWeek, startTime, endTime, isActive }) => ({
          tenantId,
          ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
          doctorId, dayOfWeek, startTime, endTime, isActive,
        }))
      ),
    }),
  ])

  return Response.json({ data: { updatedDoctors: doctors.length } })
})
