import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getTenantFromHeaders, getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantFromHeaders()
  if (!tenantId) return Response.json({ error: "Tenant not found" }, { status: 404 })

  const services = await prisma.service.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
  })
  return Response.json({ data: services })
}

const createSchema = z.object({
  name:                z.string().min(1),
  description:         z.string().optional(),
  durationMins:        z.number().int().positive().default(30),
  price:               z.number().min(0).default(0),
  priceOnConsultation: z.boolean().default(false),
  isProgramme:         z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "TENANT_ADMIN")
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId } = getScopeFromSession(session)

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const service = await prisma.service.create({
    data: { tenantId, ...parsed.data },
  })
  return Response.json({ data: service }, { status: 201 })
}
