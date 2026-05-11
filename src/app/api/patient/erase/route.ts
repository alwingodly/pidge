import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { getTenantFromHeaders } from "@/lib/tenant"
import { encryptField } from "@/lib/encryption"

// POST /api/patient/erase  { cancelToken, email }
// Anonymises PII on all appointments for this patient at this tenant.
// The appointment records are kept (for counts/audits) but all identifying
// data is overwritten. Requires the cancelToken as proof of identity.
export async function POST(req: NextRequest) {
  const { tenantId } = await getTenantFromHeaders()
  if (!tenantId) return Response.json({ error: "Tenant not found" }, { status: 404 })

  // Only available when tenant has gdprEnabled
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { gdprEnabled: true },
  })
  if (!tenant?.gdprEnabled) {
    return Response.json({ error: "Not available." }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const { cancelToken, email } = body ?? {}
  if (!cancelToken || !email) {
    return Response.json({ error: "cancelToken and email are required." }, { status: 400 })
  }

  // Verify the cancelToken belongs to an appointment for this patient + tenant
  const anchor = await prisma.appointment.findFirst({
    where: { tenantId, cancelToken, patientEmail: email },
    select: { patientEmail: true },
  })
  if (!anchor) {
    return Response.json({ error: "Invalid request." }, { status: 404 })
  }

  // Anonymise all appointments for this email at this tenant
  const DELETED = "[deleted]"
  await prisma.appointment.updateMany({
    where: { tenantId, patientEmail: email },
    data: {
      patientName:    DELETED,
      patientSurname: null,
      patientEmail:   `${cancelToken}@deleted.invalid`, // unique but non-identifying
      patientPhone:   encryptField(DELETED)!,
      patientDOB:     encryptField(DELETED),
      patientGender:  encryptField(DELETED),
      notes:          encryptField(DELETED),
      attachmentData: null,
      attachmentName: null,
    },
  })

  return Response.json({ ok: true })
}
