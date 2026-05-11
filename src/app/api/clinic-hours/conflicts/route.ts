import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getScopeFromSession } from "@/lib/tenant"

// Returns APPROVED future appointments whose assignedTime falls outside the proposed clinic hours
export const GET = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(req.auth)

  const { searchParams } = new URL(req.url)
  const startTime = searchParams.get("startTime")
  const endTime   = searchParams.get("endTime")
  if (!startTime || !endTime) return Response.json({ error: "startTime and endTime required" }, { status: 400 })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const conflicts = await prisma.appointment.findMany({
    where: {
      tenantId,
      branchId:     branchId ?? undefined,
      status:       "APPROVED",
      assignedDate: { gte: todayStart },
      assignedTime: { not: null },
      OR: [
        { assignedTime: { lt: startTime } },
        { assignedTime: { gt: endTime } },
      ],
    },
    select: {
      id:           true,
      bookingRef:   true,
      patientName:  true,
      assignedDate: true,
      assignedTime: true,
      service:      { select: { name: true } },
    },
    orderBy: { assignedDate: "asc" },
  })

  return Response.json({ data: conflicts, count: conflicts.length })
})
