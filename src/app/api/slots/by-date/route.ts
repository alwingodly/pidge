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

  if (!doctorId || !date) {
    return Response.json({ error: "doctorId and date are required" }, { status: 400 })
  }

  const slots = await prisma.slot.findMany({
    where: {
      tenantId,
      branchId:  branchId ?? undefined,
      doctorId,
      date:      new Date(date),
      // When serviceId provided, show only slots for that service (or legacy slots with no service)
      ...(serviceId ? { OR: [{ serviceId }, { serviceId: null }] } : {}),
    },
    orderBy: { startTime: "asc" },
  })

  return Response.json({ data: slots })
}
