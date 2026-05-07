import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { sendBookingOTPEmail } from "@/lib/email"
import { hmacOTP } from "@/lib/encryption"
import { randomInt } from "crypto"

const OTP_TTL_MS   = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5               // invalidate after 5 wrong guesses

export async function POST(req: NextRequest) {
  const { email, patientName } = await req.json()

  if (!email || typeof email !== "string") {
    return Response.json({ error: "Email is required." }, { status: 400 })
  }
  if (!patientName || typeof patientName !== "string") {
    return Response.json({ error: "Name is required." }, { status: 400 })
  }

  // Rate limit: one OTP request per email per 60 seconds
  const recent = await prisma.bookingOTP.findFirst({
    where:   { email },
    orderBy: { createdAt: "desc" },
  })
  if (recent) {
    const secondsSince = (Date.now() - recent.createdAt.getTime()) / 1000
    if (secondsSince < 60) {
      return Response.json(
        { error: "Please wait before requesting another code." },
        { status: 429 },
      )
    }
  }

  // Invalidate any existing OTPs for this email before issuing a new one
  await prisma.bookingOTP.deleteMany({ where: { email } })

  const otp     = randomInt(100_000, 1_000_000).toString() // cryptographically random 6-digit OTP
  const otpHash = hmacOTP(otp)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)

  await prisma.bookingOTP.create({ data: { email, otpHash, expiresAt } })

  if (process.env.NODE_ENV === "development") {
    console.log(`\n[OTP dev] ${email} → ${otp}\n`)
  }

  await sendBookingOTPEmail(email, otp, patientName)

  return Response.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  const { email, otp } = await req.json()

  if (!email || !otp) {
    return Response.json({ error: "Email and OTP are required." }, { status: 400 })
  }

  const record = await prisma.bookingOTP.findFirst({
    where: { email, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  })

  if (!record) {
    return Response.json({ error: "Code expired. Please request a new one." }, { status: 400 })
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.bookingOTP.delete({ where: { id: record.id } })
    return Response.json({ error: "Too many attempts. Please request a new code." }, { status: 429 })
  }

  const valid  = hmacOTP(otp.toString()) === record.otpHash
  if (!valid) {
    await prisma.bookingOTP.update({
      where: { id: record.id },
      data:  { attempts: { increment: 1 } },
    })
    const remaining = MAX_ATTEMPTS - record.attempts - 1
    return Response.json(
      { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` },
      { status: 400 },
    )
  }

  // Single-use: delete immediately after successful verification
  await prisma.bookingOTP.delete({ where: { id: record.id } })
  return Response.json({ ok: true })
}
