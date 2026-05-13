import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getScopeFromSession } from "@/lib/tenant"
import { decryptField } from "@/lib/encryption"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !["TENANT_ADMIN", "BRANCH_ADMIN"].includes(session.user.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = req.nextUrl.searchParams.get("email")?.trim()
  if (!email) return Response.json({ error: "email required" }, { status: 400 })

  const { tenantId, branchId } = getScopeFromSession(session)

  const appointments = await prisma.appointment.findMany({
    where:   { tenantId, patientEmail: email, ...(branchId ? { branchId } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id:            true,
      bookingRef:    true,
      status:        true,
      preferredDate: true,
      assignedDate:  true,
      assignedTime:  true,
      createdAt:     true,
      patientDOB:    true,
      patientGender: true,
      patientPhone:  true,
      notes:         true,
      service: { select: { name: true, durationMins: true } },
      doctor:  { select: { name: true } },
      branch:  { select: { name: true } },
    },
  })

  const decrypted = appointments.map((a) => {
    let phone = "", gender = "", dob = "", notes = ""
    try { phone  = decryptField(a.patientPhone)  ?? "" } catch { /* key mismatch */ }
    try { gender = decryptField(a.patientGender) ?? "" } catch { /* key mismatch */ }
    try { dob    = decryptField(a.patientDOB)    ?? "" } catch { /* key mismatch */ }
    try { notes  = decryptField(a.notes)         ?? "" } catch { /* key mismatch */ }
    return { ...a, patientPhone: phone, patientGender: gender, patientDOB: dob, notes }
  })

  return Response.json({ data: decrypted })
}
