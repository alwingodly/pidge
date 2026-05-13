import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { sendBookingOTPEmail } from "@/lib/email"
import { hmacOTP, signBookingToken, decryptField } from "@/lib/encryption"
import { getTenantFromHeaders } from "@/lib/tenant"
import { randomInt, timingSafeEqual } from "crypto"

const OTP_TTL_MS        = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS      = 5               // invalidate after 5 wrong guesses
const EMAIL_COOLDOWN_S  = 60             // seconds between requests per email
const IP_WINDOW_MS      = 60 * 60 * 1000 // 1-hour window for IP limit
const IP_MAX_PER_WINDOW = 10             // max OTP requests per IP per hour

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const { email, patientName } = body ?? {}

    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required." }, { status: 400 })
    }
    if (!patientName || typeof patientName !== "string") {
      return Response.json({ error: "Name is required." }, { status: 400 })
    }

    const ip  = getIp(req)
    const dev = process.env.NODE_ENV === "development"

    if (!dev) {
      // IP rate limit: max 10 OTP requests per hour per IP
      const ipCount = await prisma.bookingOTP.count({
        where: {
          ipAddress: ip,
          createdAt: { gt: new Date(Date.now() - IP_WINDOW_MS) },
        },
      })
      if (ipCount >= IP_MAX_PER_WINDOW) {
        return Response.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 },
        )
      }

      // Per-email cooldown: 60 seconds between requests
      const recent = await prisma.bookingOTP.findFirst({
        where:   { email },
        orderBy: { createdAt: "desc" },
      })
      if (recent) {
        const secondsSince = (Date.now() - recent.createdAt.getTime()) / 1000
        if (secondsSince < EMAIL_COOLDOWN_S) {
          return Response.json(
            { error: "Please wait before requesting another code." },
            { status: 429 },
          )
        }
      }
    }

    // Invalidate any existing OTPs for this email before issuing a new one
    await prisma.bookingOTP.deleteMany({ where: { email } })

    const otp       = randomInt(100_000, 1_000_000).toString()
    const otpHash   = hmacOTP(otp)
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)

    await prisma.bookingOTP.create({ data: { email, otpHash, expiresAt, ipAddress: ip } })

    if (process.env.NODE_ENV === "development") {
      console.log(`\n[OTP dev] ${email} → ${otp}\n`)
    }

    await sendBookingOTPEmail(email, otp, patientName)

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[booking-otp POST]", err)
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
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

  const computedHash = Buffer.from(hmacOTP(otp.toString()), "hex")
  const storedHash   = Buffer.from(record.otpHash, "hex")
  const valid = computedHash.length === storedHash.length && timingSafeEqual(computedHash, storedHash)
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

  // Look up existing patient at this tenant to enforce data consistency
  const { tenantId } = await getTenantFromHeaders()
  let existingPatient: { name: string; surname: string; phone: string } | null = null
  if (tenantId) {
    const prior = await prisma.appointment.findFirst({
      where:   { tenantId, patientEmail: email, patientName: { not: "[deleted]" } },
      orderBy: { createdAt: "desc" },
      select:  { patientName: true, patientSurname: true, patientPhone: true },
    })
    if (prior) {
      let phone = ""
      try { phone = decryptField(prior.patientPhone) ?? "" } catch { /* key mismatch */ }
      existingPatient = { name: prior.patientName, surname: prior.patientSurname ?? "", phone }
    }
  }

  return Response.json({ ok: true, bookingToken: signBookingToken(email), existingPatient })
}
