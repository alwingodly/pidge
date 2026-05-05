import { NextRequest } from "next/server"
import { sendBookingOTPEmail } from "@/lib/email"

// Testing phase: OTP is always "0000"
const TEST_OTP = "0000"

export async function POST(req: NextRequest) {
  const { email, patientName } = await req.json()

  if (!email || !patientName) {
    return Response.json({ error: "Email and name are required." }, { status: 400 })
  }

  await sendBookingOTPEmail(email, TEST_OTP, patientName)

  return Response.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  const { otp } = await req.json()

  if (!otp) {
    return Response.json({ error: "OTP is required." }, { status: 400 })
  }

  const valid = otp === TEST_OTP
  if (!valid) {
    return Response.json({ error: "Incorrect code. Please try again." }, { status: 400 })
  }

  return Response.json({ ok: true })
}
