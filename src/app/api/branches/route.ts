import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

const createSchema = z.object({
  name:     z.string().min(1),
  slug:     z.string().min(1).regex(/^[a-z0-9-]+$/),
  address:  z.string().optional(),
  phone:    z.string().optional(),
  timezone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  const { tenantId } = getScopeFromSession(session)

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const branch = await prisma.branch.create({
    data: { tenantId, ...parsed.data },
  })
  return Response.json({ data: branch }, { status: 201 })
}
