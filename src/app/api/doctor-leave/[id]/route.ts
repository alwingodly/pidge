import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"

export const DELETE = auth(async (req, ctx) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId } = getScopeFromSession(req.auth)
  const { id } = await (ctx?.params as Promise<{ id: string }>)

  const leave = await prisma.doctorLeave.findUnique({ where: { id }, select: { tenantId: true } })
  if (!leave || leave.tenantId !== tenantId) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.doctorLeave.delete({ where: { id } })
  return Response.json({ ok: true })
})
