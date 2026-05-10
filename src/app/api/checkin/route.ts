import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { getTenantFromHeaders } from "@/lib/tenant"
import { generateBookingRef, generateCancelToken } from "@/lib/booking-ref"
import { sendWalkInCheckIn, sendAdminWalkInAlert } from "@/lib/email"
import { encryptField } from "@/lib/encryption"
import { recordAppointmentStatusChange } from "@/lib/audit"
import { z } from "zod"

const checkinSchema = z.object({
  branchId:       z.string().uuid().optional(),
  serviceId:      z.string().uuid(),
  patientName:    z.string().min(1).max(100),
  patientSurname: z.string().max(100).optional(),
  patientEmail:   z.string().email(),
  patientPhone:   z.string().min(1).max(30),
  patientDOB:     z.string().optional(),
  patientGender:  z.string().max(50).optional(),
  notes:          z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const { tenantId, branchId } = await getTenantFromHeaders()
  if (!tenantId) return Response.json({ error: "Tenant not found" }, { status: 404 })

  const featureTenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { walkInEnabled: true, branchModeEnabled: true },
  })
  if (!featureTenant?.walkInEnabled) {
    return Response.json({ error: "Walk-in check-in is not enabled." }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = checkinSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const {
    branchId: bodyBranchId, serviceId,
    patientName, patientSurname, patientEmail, patientPhone,
    patientDOB, patientGender, notes,
  } = parsed.data

  let resolvedBranchId = branchId ?? null
  if (featureTenant.branchModeEnabled && bodyBranchId) {
    const branch = await prisma.branch.findUnique({
      where:  { id: bodyBranchId, tenantId, isActive: true },
      select: { id: true },
    })
    if (!branch) return Response.json({ error: "Invalid branch" }, { status: 400 })
    resolvedBranchId = branch.id
  }

  // Verify service belongs to this tenant
  const service = await prisma.service.findUnique({
    where:  { id: serviceId, tenantId, isActive: true },
    select: { id: true, name: true },
  })
  if (!service) return Response.json({ error: "Service not found" }, { status: 400 })

  const bookingRef  = generateBookingRef()
  const cancelToken = generateCancelToken()
  const now         = new Date()

  const appointmentData: Prisma.AppointmentUncheckedCreateInput = {
    tenantId,
    branchId:        resolvedBranchId,
    serviceId,
    slotId:          null,
    doctorId:        null,
    patientName,
    patientSurname:  patientSurname ?? null,
    patientEmail,
    patientPhone:    encryptField(patientPhone)!,
    patientDOB:      patientDOB ? encryptField(new Date(patientDOB).toISOString()) : null,
    patientGender:   encryptField(patientGender),
    notes:           encryptField(notes),
    attachmentData:  null,
    attachmentName:  null,
    preferredDate:   null,
    bookingRef,
    cancelToken,
    status:          "CHECKED_IN",
    appointmentType: "WALK_IN",
    checkedInAt:     now,
  }

  const [appointment, tenantRow, branch, tenantAdmin] = await Promise.all([
    prisma.appointment.create({ data: appointmentData }),
    prisma.tenant.findUniqueOrThrow({
      where:  { id: tenantId },
      select: { name: true, slug: true, notificationEmail: true, bookingAlertsEnabled: true },
    }),
    resolvedBranchId
      ? prisma.branch.findUnique({ where: { id: resolvedBranchId } })
      : Promise.resolve(null),
    prisma.adminUser.findFirst({
      where:  { tenantId, role: "TENANT_ADMIN" },
      select: { email: true },
    }),
  ])

  const tenant = { ...tenantRow, adminEmail: tenantAdmin?.email ?? null }

  const apptForEmail = {
    bookingRef:     appointment.bookingRef,
    patientName,
    patientSurname: patientSurname ?? null,
    patientEmail,
    patientPhone,
    checkedInAt:    now,
    service:        { name: service.name },
    tenant,
    branch,
  }

  await Promise.all([
    recordAppointmentStatusChange({
      tenantId,
      appointmentId: appointment.id,
      toStatus: "CHECKED_IN",
      note: "Walk-in check-in created",
      metadata: { appointmentType: "WALK_IN" },
    }),
    sendWalkInCheckIn(apptForEmail),
    ...(tenant.bookingAlertsEnabled ? [sendAdminWalkInAlert(apptForEmail)] : []),
  ])

  return Response.json({ bookingRef: appointment.bookingRef }, { status: 201 })
}
