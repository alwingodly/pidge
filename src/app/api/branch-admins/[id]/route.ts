import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TENANT_ADMIN") {
    return Response.json({ error: "Only tenant admins can change passwords" }, { status: 403 })
  }

  const { tenantId } = getScopeFromSession(session)
  const { id }       = await params
  const { password } = await req.json()

  if (!password || password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }

  const admin = await prisma.adminUser.findUnique({ where: { id, tenantId, role: "BRANCH_ADMIN" } })
  if (!admin) return Response.json({ error: "Admin not found" }, { status: 404 })

  const hashed = await bcrypt.hash(password, 12)
  await prisma.adminUser.update({ where: { id }, data: { password: hashed } })

  return Response.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TENANT_ADMIN") {
    return Response.json({ error: "Only tenant admins can remove branch admins" }, { status: 403 })
  }

  const { tenantId } = getScopeFromSession(session)
  const { id } = await params

  const admin = await prisma.adminUser.findUnique({ where: { id, tenantId, role: "BRANCH_ADMIN" } })
  if (!admin) return Response.json({ error: "Admin not found" }, { status: 404 })

  await prisma.adminUser.update({ where: { id }, data: { isActive: false } })

  return Response.json({ success: true })
}
