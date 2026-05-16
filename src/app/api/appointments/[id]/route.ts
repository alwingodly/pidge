import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { sendAssignmentConfirmation, sendCancellationEmail, sendRescheduleEmail, sendReviewRequestEmail } from "@/lib/email"
import { decryptField } from "@/lib/encryption"
import { recordAppointmentStatusChange, recordAuditLog } from "@/lib/audit"
import { z } from "zod"

function decryptAppointment<T extends {
  patientPhone:   string
  patientDOB:     string | null
  patientGender:  string | null
  notes:          string | null
  attachmentData: string | null
}>(a: T): T {
  return {
    ...a,
    patientPhone:   decryptField(a.patientPhone)!,
    patientDOB:     decryptField(a.patientDOB),
    patientGender:  decryptField(a.patientGender),
    notes:          decryptField(a.notes),
    attachmentData: decryptField(a.attachmentData),
  }
}

function idFromUrl(url: string) {
  return new URL(url).pathname.split("/").pop() ?? ""
}

function toMins(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function addMinutes(time: string, duration: number) {
  const total = toMins(time) + duration
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

function overlaps(start: string, duration: number, existingStart: string, existingDuration: number) {
  const aStart = toMins(start)
  const aEnd = aStart + duration
  const bStart = toMins(existingStart)
  const bEnd = bStart + existingDuration
  return aStart < bEnd && aEnd > bStart
}

export const GET = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(req.auth)
  const id = idFromUrl(req.url)

  const appointment = await prisma.appointment.findUnique({
    where:   { id, tenantId, ...(branchId ? { branchId } : {}) },
    include: {
      slot: true,
      service: true,
      doctor: true,
      branch: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!appointment) return Response.json({ error: "Not found" }, { status: 404 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { patientHistoryEnabled: true },
  })

  const patientHistory = tenant?.patientHistoryEnabled
    ? await prisma.appointment.findMany({
        where: {
          tenantId,
          branchId: branchId ?? undefined,
          patientEmail: appointment.patientEmail,
          id: { not: appointment.id },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          bookingRef: true,
          status: true,
          appointmentType: true,
          preferredDate: true,
          assignedDate: true,
          assignedTime: true,
          createdAt: true,
          service: { select: { name: true } },
          doctor: { select: { name: true } },
        },
      })
    : []

  return Response.json({
    data: {
      ...decryptAppointment(appointment),
      patientHistory,
      patientHistoryEnabled: tenant?.patientHistoryEnabled ?? true,
    },
  })
})

const patchSchema = z.object({
  status:           z.enum(["APPROVED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
  doctorId:         z.string().uuid().optional(),
  slotId:           z.string().uuid().optional(),
  assignedDate:     z.string().optional(),
  assignedTime:     z.string().regex(/^\d{2}:\d{2}$/).optional(),
  finalPrice:       z.number().min(0).optional(),
  reschedule:       z.boolean().optional(),
  previousDate:     z.string().optional(),
  previousTime:     z.string().optional(),
})

export const PATCH = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(req.auth)
  const id = idFromUrl(req.url)

  const body   = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { status, doctorId, slotId, assignedDate, assignedTime, finalPrice, reschedule, previousDate, previousTime } = parsed.data

  // Validate assignedDate is a real date
  let parsedAssignedDate: Date | undefined
  if (assignedDate) {
    parsedAssignedDate = new Date(assignedDate)
    if (isNaN(parsedAssignedDate.getTime()))
      return Response.json({ error: "Invalid assignedDate." }, { status: 400 })
  }

  // Reject changes to already-terminal appointments
  const current = await prisma.appointment.findUnique({
    where:  { id, tenantId, ...(branchId ? { branchId } : {}) },
    select: { status: true, doctorId: true, assignedDate: true, assignedTime: true, slotId: true, serviceId: true, branchId: true },
  })
  if (!current) return Response.json({ error: "Not found" }, { status: 404 })
  if (current.status === "CANCELLED" || current.status === "COMPLETED") {
    return Response.json({ error: "This appointment can no longer be modified." }, { status: 409 })
  }

  // Verify the doctor being assigned belongs to this tenant (and branch for branch admins)
  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({
      where:  { id: doctorId, tenantId, ...(branchId ? { branchId } : {}) },
      select: { id: true },
    })
    if (!doctor) return Response.json({ error: "Invalid clinician." }, { status: 400 })
  }

  if (status === "APPROVED" && (!doctorId || !parsedAssignedDate || !assignedTime)) {
    return Response.json({ error: "Approving an appointment requires clinician, date, and time." }, { status: 400 })
  }

  const selectedSlot = status === "APPROVED" && slotId && doctorId && parsedAssignedDate && assignedTime
    ? await prisma.slot.findFirst({
        where: {
          id: slotId,
          tenantId,
          doctorId,
          isBooked: false,
          date: parsedAssignedDate,
          startTime: assignedTime,
          ...(current.branchId ? { branchId: current.branchId } : {}),
          OR: [{ serviceId: current.serviceId }, { serviceId: null }],
        },
        select: { id: true, doctorId: true, date: true, startTime: true },
      })
    : null

  if (status === "APPROVED" && slotId && !selectedSlot) {
    return Response.json({ error: "Selected slot is no longer available." }, { status: 409 })
  }

  let appointment
  try {
    appointment = await prisma.$transaction(async (tx) => {
      if ((status === "CANCELLED" || selectedSlot) && current.slotId) {
        await tx.slot.update({ where: { id: current.slotId }, data: { isBooked: false } }).catch(() => null)
      }
      let reservedSlot = selectedSlot
      const appointmentService = status === "APPROVED"
        ? await tx.service.findUniqueOrThrow({
            where: { id: current.serviceId, tenantId },
            select: { id: true, durationMins: true },
          })
        : null

      if (status === "APPROVED" && doctorId && parsedAssignedDate && assignedTime && appointmentService) {
        const assignedDuration = reservedSlot?.startTime === assignedTime
          ? (await tx.slot.findUnique({
              where: { id: reservedSlot.id },
              select: { durationMins: true },
            }))?.durationMins ?? appointmentService.durationMins
          : appointmentService.durationMins
        const clashes = await tx.appointment.findMany({
          where: {
            tenantId,
            id: { not: id },
            doctorId,
            assignedDate: parsedAssignedDate,
            assignedTime: { not: null },
            status: { not: "CANCELLED" },
          },
          select: { assignedTime: true, service: { select: { durationMins: true } } },
        })
        const hasClash = clashes.some((item) =>
          item.assignedTime && overlaps(assignedTime, assignedDuration, item.assignedTime, item.service.durationMins),
        )
        if (hasClash) throw new Error("TIME_UNAVAILABLE")
      }

      if (status === "APPROVED" && !reservedSlot && doctorId && parsedAssignedDate && assignedTime && appointmentService) {
        reservedSlot = await tx.slot.create({
          data: {
            tenantId,
            branchId: current.branchId,
            doctorId,
            serviceId: current.serviceId,
            durationMins: appointmentService.durationMins,
            date: parsedAssignedDate,
            startTime: assignedTime,
            endTime: addMinutes(assignedTime, appointmentService.durationMins),
            isBooked: true,
          },
          select: { id: true, doctorId: true, date: true, startTime: true },
        })
      } else if (reservedSlot) {
        const claimed = await tx.slot.updateMany({
          where: { id: reservedSlot.id, isBooked: false },
          data: { isBooked: true },
        })
        if (claimed.count !== 1) throw new Error("SLOT_UNAVAILABLE")
      }
      return tx.appointment.update({
        where: { id, tenantId, ...(branchId ? { branchId } : {}) },
        data:  {
          status,
          ...(finalPrice !== undefined ? { finalPrice } : {}),
          ...(reservedSlot ? {
            slotId: reservedSlot.id,
            doctorId: reservedSlot.doctorId,
            assignedDate: reservedSlot.date,
            assignedTime: reservedSlot.startTime,
          } : {}),
        },
        include: { slot: true, service: true, doctor: true, tenant: true, branch: true },
      })
    })
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_UNAVAILABLE") {
      return Response.json({ error: "Selected slot is no longer available." }, { status: 409 })
    }
    if (error instanceof Error && error.message === "TIME_UNAVAILABLE") {
      return Response.json({ error: "Clinician already has an appointment at that time." }, { status: 409 })
    }
    throw error
  }

  const actor = {
    id: req.auth.user.id,
    name: req.auth.user.name,
    role: req.auth.user.role,
  }

  if (current.status !== status) {
    await recordAppointmentStatusChange({
      tenantId,
      appointmentId: appointment.id,
      fromStatus: current.status,
      toStatus: status,
      actor,
      note: reschedule ? "Appointment rescheduled" : null,
      metadata: {
        doctorId: doctorId ?? null,
        slotId: slotId ?? null,
        assignedDate: assignedDate ?? null,
        assignedTime: assignedTime ?? null,
      },
    })
  } else if (
    doctorId !== current.doctorId ||
    assignedDate ||
    assignedTime !== current.assignedTime
  ) {
    await recordAuditLog({
      tenantId,
      appointmentId: appointment.id,
      actor,
      action: reschedule ? "APPOINTMENT_RESCHEDULED" : "APPOINTMENT_ASSIGNMENT_UPDATED",
      entityType: "Appointment",
      entityId: appointment.id,
      metadata: {
        status,
        doctorId: doctorId ?? null,
        slotId: slotId ?? null,
        assignedDate: assignedDate ?? null,
        assignedTime: assignedTime ?? null,
      },
    })
  }

  try {
    const decrypted = decryptAppointment(appointment)
    if (status === "APPROVED" && reschedule && previousDate && previousTime) {
      if (appointment.tenant.rescheduleEmailEnabled)
        await sendRescheduleEmail(decrypted, previousDate, previousTime)
    } else if (status === "APPROVED") {
      if (appointment.tenant.assignmentEmailEnabled)
        await sendAssignmentConfirmation(decrypted)
    }
    if (status === "CANCELLED" && appointment.tenant.cancellationEmailEnabled) await sendCancellationEmail(decrypted)
    if (status === "COMPLETED" && appointment.tenant.reviewEmailEnabled && appointment.tenant.reviewLink)
      await sendReviewRequestEmail(decrypted, appointment.tenant.reviewLink)

    return Response.json({ data: decrypted })
  } catch (error) {
    console.error(`Could not decrypt appointment ${appointment.id} after update`, error)
    return Response.json({
      data: {
        id: appointment.id,
        status: appointment.status,
        doctorId: appointment.doctorId,
        assignedDate: appointment.assignedDate,
        assignedTime: appointment.assignedTime,
      },
      warning: "Appointment updated, but notification email could not be sent because stored patient data could not be decrypted.",
    })
  }
})
