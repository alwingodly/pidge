import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(session)

  const { searchParams } = new URL(req.url)
  const doctorId  = searchParams.get("doctorId")
  const serviceId = searchParams.get("serviceId")
  const date      = searchParams.get("date")
  const filterBranchId = searchParams.get("branchId")
  const availableOnly = searchParams.get("available") === "true"

  if (!doctorId || !date) {
    return Response.json({ error: "doctorId and date are required" }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date must be YYYY-MM-DD" }, { status: 400 })
  }
  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    return Response.json({ error: "Invalid date." }, { status: 400 })
  }

  const effectiveBranchId = branchId ?? filterBranchId ?? undefined
  if (filterBranchId && !branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: filterBranchId, tenantId, isActive: true },
      select: { id: true },
    })
    if (!branch) return Response.json({ error: "Invalid branch." }, { status: 400 })
  }

  const slots = await prisma.slot.findMany({
    where: {
      tenantId,
      branchId:  effectiveBranchId,
      doctorId,
      date:      parsedDate,
      ...(availableOnly ? { isBooked: false } : {}),
      // When serviceId provided, show only slots for that service (or legacy slots with no service)
      ...(serviceId ? { OR: [{ serviceId }, { serviceId: null }] } : {}),
    },
    orderBy: { startTime: "asc" },
  })

  return Response.json({ data: slots })
}
