import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

const schema = z.object({
  serviceId:   z.string().uuid(),
  branchId:    z.string().uuid(),
  isOffered:   z.boolean().optional(),
  isAvailable: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { tenantId, branchId: sessionBranchId } = getScopeFromSession(session)
  const role = session.user.role

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { serviceId, branchId, isOffered, isAvailable } = parsed.data

  // isOffered is tenant-admin only
  if (isOffered !== undefined && role !== "TENANT_ADMIN") {
    return Response.json({ error: "Only tenant admins can change whether a service is offered" }, { status: 403 })
  }

  // Branch admin can only touch their own branch
  if (role === "BRANCH_ADMIN" && branchId !== sessionBranchId) {
    return Response.json({ error: "You can only manage availability for your own branch" }, { status: 403 })
  }

  // Verify service belongs to this tenant
  const service = await prisma.service.findUnique({ where: { id: serviceId, tenantId } })
  if (!service) return Response.json({ error: "Service not found" }, { status: 404 })

  // Verify branch belongs to this tenant
  const branch = await prisma.branch.findUnique({ where: { id: branchId, tenantId } })
  if (!branch) return Response.json({ error: "Branch not found" }, { status: 404 })

  const config = await prisma.serviceBranchConfig.upsert({
    where:  { serviceId_branchId: { serviceId, branchId } },
    create: { tenantId, serviceId, branchId, isOffered: isOffered ?? true, isAvailable: isAvailable ?? true },
    update: {
      ...(isOffered   !== undefined ? { isOffered }   : {}),
      ...(isAvailable !== undefined ? { isAvailable } : {}),
    },
  })

  return Response.json({ data: config })
}
