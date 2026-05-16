import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

const updateSchema = z.object({
  name:         z.string().min(1).optional(),
  description:  z.string().optional(),
  durationMins: z.number().int().positive().optional(),
  price:               z.number().min(0).optional(),
  priceOnConsultation: z.boolean().optional(),
  isProgramme:         z.boolean().optional(),
  isActive:            z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "TENANT_ADMIN")
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId } = getScopeFromSession(session)
  const { id } = await params

  const body   = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const service = await prisma.service.update({
    where: { id, tenantId },
    data:  parsed.data,
  })
  return Response.json({ data: service })
}
