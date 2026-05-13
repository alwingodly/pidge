import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { getTenantFromHeaders } from "@/lib/tenant"
import { encryptField } from "@/lib/encryption"
import { recordAppointmentStatusChange } from "@/lib/audit"

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

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Step 1: Cancel future active appointments — no operational purpose for an anonymous patient.
  // UK GDPR Art.17(3): completed/historical records are kept for legitimate audit purposes.
  const activeAppointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      patientEmail: email,
      status: { in: ["PENDING", "APPROVED"] },
      OR: [
        { assignedDate:  { gte: todayStart } },
        { preferredDate: { gte: todayStart } },
        { assignedDate: null, preferredDate: null }, // unscheduled pending
      ],
    },
    select: { id: true, status: true, slotId: true },
  })

  if (activeAppointments.length > 0) {
    const ids = activeAppointments.map(a => a.id)

    await prisma.appointment.updateMany({
      where: { id: { in: ids } },
      data:  { status: "CANCELLED" },
    })

    // Free any reserved slots
    const slotIds = activeAppointments.map(a => a.slotId).filter(Boolean) as string[]
    if (slotIds.length > 0) {
      await prisma.slot.updateMany({
        where: { id: { in: slotIds } },
        data:  { isBooked: false },
      })
    }

    // Audit trail — record each cancellation
    await Promise.all(activeAppointments.map(a =>
      recordAppointmentStatusChange({
        tenantId,
        appointmentId: a.id,
        fromStatus:    a.status,
        toStatus:      "CANCELLED",
        note:          "Cancelled automatically — patient exercised right to erasure (UK GDPR Art.17)",
      })
    ))
  }

  // Step 2: Anonymise PII on ALL appointments (past and future)
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

  return Response.json({ ok: true, cancelledAppointments: activeAppointments.length })
}
