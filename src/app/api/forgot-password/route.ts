import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || typeof email !== "string") {
    return Response.json({ error: "Email is required." }, { status: 400 })
  }

  // Always return the same response — never reveal whether an account exists
  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } })

  if (user) {
    // Delete any existing token for this email
    await prisma.passwordResetToken.deleteMany({ where: { email: user.email } })

    const token     = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordResetToken.create({
      data: { email: user.email, token, expiresAt },
    })

    const resetUrl = `${APP_URL}/admin/reset-password?token=${token}`
    await sendPasswordResetEmail(user.email, resetUrl)
  }

  // Always return success to avoid email enumeration
  return Response.json({ ok: true })
}
