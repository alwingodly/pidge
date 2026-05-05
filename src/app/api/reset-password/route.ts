import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || !password) {
    return Response.json({ error: "Token and password are required." }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!record) {
    return Response.json({ error: "Invalid or expired reset link." }, { status: 400 })
  }
  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } })
    return Response.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 })
  }

  const user = await prisma.adminUser.findUnique({ where: { email: record.email } })
  if (!user) {
    return Response.json({ error: "Account not found." }, { status: 404 })
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: user.id }, data: { password: hashed } }),
    prisma.passwordResetToken.delete({ where: { token } }),
  ])

  return Response.json({ ok: true })
}
