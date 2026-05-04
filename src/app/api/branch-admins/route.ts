import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { tenantId } = getScopeFromSession(session)
  const branchId = new URL(req.url).searchParams.get("branchId")

  const admins = await prisma.adminUser.findMany({
    where: {
      tenantId,
      role: "BRANCH_ADMIN",
      ...(branchId ? { branchId } : {}),
    },
    select: { id: true, name: true, email: true, isActive: true, branchId: true },
    orderBy: { name: "asc" },
  })

  return Response.json({ data: admins })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TENANT_ADMIN") {
    return Response.json({ error: "Only tenant admins can create branch admins" }, { status: 403 })
  }

  const { tenantId } = getScopeFromSession(session)
  const { branchId, name, email, password } = await req.json()

  if (!branchId || !name || !email || !password) {
    return Response.json({ error: "branchId, name, email, and password are required" }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  // Verify branch belongs to this tenant
  const branch = await prisma.branch.findUnique({ where: { id: branchId, tenantId } })
  if (!branch) return Response.json({ error: "Branch not found" }, { status: 404 })

  const existing = await prisma.adminUser.findUnique({ where: { email } })
  if (existing) return Response.json({ error: "An admin with this email already exists" }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)

  const admin = await prisma.adminUser.create({
    data: { tenantId, branchId, name, email, password: hashed, role: "BRANCH_ADMIN" },
    select: { id: true, name: true, email: true, isActive: true, branchId: true },
  })

  return Response.json({ data: admin }, { status: 201 })
}
