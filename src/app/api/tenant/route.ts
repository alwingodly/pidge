import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const patchSchema = z.object({
  clinicStartTime: z.string().regex(timeRegex, "Must be HH:MM").optional(),
  clinicEndTime:   z.string().regex(timeRegex, "Must be HH:MM").optional(),
})

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "TENANT_ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { tenantId } = getScopeFromSession(session)

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { clinicStartTime: true, clinicEndTime: true },
  })
  return Response.json({ data: tenant })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "TENANT_ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { tenantId } = getScopeFromSession(session)

  const body   = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  // Validate start < end when both are provided
  const { clinicStartTime, clinicEndTime } = parsed.data
  if (clinicStartTime && clinicEndTime && clinicStartTime >= clinicEndTime) {
    return Response.json({ error: "Opening time must be before closing time" }, { status: 400 })
  }

  const tenant = await prisma.tenant.update({
    where:  { id: tenantId },
    data:   parsed.data,
    select: { clinicStartTime: true, clinicEndTime: true },
  })
  return Response.json({ data: tenant })
}
