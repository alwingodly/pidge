import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { getTenantFromHeaders } from "@/lib/tenant"
import { generateBookingRef, generateCancelToken } from "@/lib/booking-ref"
import { encryptField, decryptField } from "@/lib/encryption"
import { sendBookingAcknowledgement, sendAdminNewRequest } from "@/lib/email"
import { formatDate, formatTime } from "@/lib/utils"
import { recordAppointmentStatusChange } from "@/lib/audit"

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: "date must be YYYY-MM-DD" }
  const date = new Date(value)
  if (isNaN(date.getTime())) return { error: "Invalid date" }
  return { date }
}

export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantFromHeaders()
  const { searchParams } = new URL(req.url)
  const token   = searchParams.get("token")
  const preview = searchParams.get("preview")

  if (!token) return Response.json({ error: "Invalid link" }, { status: 400 })
  if (!preview) return Response.json({ error: "Use POST to reschedule" }, { status: 405 })

  const appointment = await prisma.appointment.findFirst({
    where:   { cancelToken: token, ...(tenantId ? { tenantId } : {}) },
    include: { slot: true, service: true, doctor: true },
  })

  if (!appointment)                       return Response.json({ error: "Booking not found" }, { status: 404 })
  if (appointment.status === "CANCELLED") return Response.json({ error: "This appointment has already been cancelled" }, { status: 400 })
  if (appointment.status === "COMPLETED") return Response.json({ error: "Completed appointments cannot be rescheduled" }, { status: 400 })

  const dateStr = appointment.assignedDate
    ? formatDate(appointment.assignedDate)
    : appointment.slot ? formatDate(appointment.slot.date)
    : appointment.preferredDate ? formatDate(appointment.preferredDate)
    : "To be confirmed"

  const timeStr = appointment.assignedTime
    ?? (appointment.slot ? formatTime(appointment.slot.startTime) : null)

  return Response.json({
    bookingRef:  appointment.bookingRef,
    patientName: appointment.patientName,
    service:     appointment.service.name,
    doctor:      appointment.doctor?.name ?? "To be assigned",
    date:        dateStr,
    time:        timeStr ?? "To be confirmed",
  })
}

export async function POST(req: NextRequest) {
  const { tenantId } = await getTenantFromHeaders()
  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: "Invalid request" }, { status: 400 })

  const { token, preferredDate: rawDate } = body as { token?: string; preferredDate?: string }

  if (!token)   return Response.json({ error: "Invalid link" }, { status: 400 })
  if (!rawDate) return Response.json({ error: "A new date is required" }, { status: 400 })

  const parsed = parseDateOnly(rawDate)
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 })

  const old = await prisma.appointment.findFirst({
    where:   { cancelToken: token, ...(tenantId ? { tenantId } : {}) },
    include: { slot: true, service: true, doctor: true, branch: true, tenant: true },
  })

  if (!old)                       return Response.json({ error: "Booking not found" }, { status: 404 })
  if (old.status === "CANCELLED") return Response.json({ error: "This appointment has already been cancelled" }, { status: 400 })
  if (old.status === "COMPLETED") return Response.json({ error: "Completed appointments cannot be rescheduled" }, { status: 400 })

  const bookingRef  = generateBookingRef()
  const cancelToken = generateCancelToken()

  // Decrypt sensitive fields from old appointment to re-encrypt into the new one
  const plainPhone  = decryptField(old.patientPhone) ?? ""
  const plainDOB    = decryptField(old.patientDOB)
  const plainGender = decryptField(old.patientGender)
  const plainNotes  = decryptField(old.notes)
  const plainAttach = decryptField(old.attachmentData)

  const [newAppt, tenant, adminUser] = await Promise.all([
    prisma.appointment.create({
      data: {
        tenantId:        old.tenantId,
        serviceId:       old.serviceId,
        branchId:        old.branchId,
        doctorId:        old.doctorId,
        slotId:          null,
        preferredDate:   parsed.date,
        patientName:     old.patientName,
        patientSurname:  old.patientSurname,
        patientEmail:    old.patientEmail,
        patientPhone:    encryptField(plainPhone)!,
        patientDOB:      plainDOB ? encryptField(plainDOB) : null,
        patientGender:   encryptField(plainGender),
        notes:           encryptField(plainNotes),
        attachmentData:  encryptField(plainAttach),
        attachmentName:  old.attachmentName,
        bookingRef,
        cancelToken,
        status: "PENDING",
      },
    }),
    prisma.tenant.findUniqueOrThrow({
      where:  { id: old.tenantId },
      select: { name: true, slug: true, notificationEmail: true, bookingAlertsEnabled: true },
    }),
    prisma.adminUser.findFirst({
      where:  { tenantId: old.tenantId, role: "TENANT_ADMIN" },
      select: { email: true },
    }),
  ])

  // Cancel old appointment and free its slot
  await prisma.appointment.update({
    where: { id: old.id },
    data:  { status: "CANCELLED" },
  })

  await recordAppointmentStatusChange({
    tenantId:      old.tenantId,
    appointmentId: old.id,
    fromStatus:    old.status,
    toStatus:      "CANCELLED",
    note:          "Patient rescheduled to a new date",
  })

  if (old.slotId) {
    await prisma.slot.update({ where: { id: old.slotId }, data: { isBooked: false } }).catch(() => null)
  }

  await recordAppointmentStatusChange({
    tenantId:      old.tenantId,
    appointmentId: newAppt.id,
    toStatus:      "PENDING",
    note:          "Created via patient reschedule",
    metadata:      { rescheduledFrom: old.bookingRef },
  })

  const tenantFull = { ...tenant, adminEmail: adminUser?.email ?? null }

  const apptForEmail = {
    ...newAppt,
    patientPhone:   plainPhone,
    patientDOB:     plainDOB ? new Date(plainDOB) : null,
    patientGender:  plainGender,
    notes:          plainNotes,
    attachmentData: plainAttach,
    tenant:         tenantFull,
    service:        old.service,
    branch:         old.branch,
    slot:           null,
    doctor:         old.doctor,
  }

  await Promise.all([
    sendBookingAcknowledgement(apptForEmail),
    ...(tenantFull.bookingAlertsEnabled ? [sendAdminNewRequest(apptForEmail)] : []),
  ])

  return Response.json({ bookingRef }, { status: 201 })
}
