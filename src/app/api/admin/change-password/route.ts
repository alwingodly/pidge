import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["TENANT_ADMIN", "BRANCH_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 })
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 })
  }

  const admin = await prisma.adminUser.findUnique({
    where:  { id: session.user.id },
    select: { password: true },
  })
  if (!admin) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 })
  }

  const valid = await bcrypt.compare(currentPassword, admin.password)
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.adminUser.update({
    where: { id: session.user.id },
    data:  { password: hashed },
  })

  return NextResponse.json({ ok: true })
}
