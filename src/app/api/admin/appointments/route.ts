import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { generateBookingRef, generateCancelToken } from "@/lib/booking-ref"
import { encryptField } from "@/lib/encryption"
import { sendAdminNewRequest, sendBookingAcknowledgement } from "@/lib/email"
import { recordAppointmentStatusChange } from "@/lib/audit"
import { z } from "zod"

const manualCreateSchema = z.object({
  branchId:       z.string().uuid().optional(),
  serviceId:      z.string().uuid(),
  doctorId:       z.string().uuid().optional(),
  slotId:         z.string().uuid().optional(),
  preferredDate:  z.string().optional(),
  assignedDate:   z.string().optional(),
  assignedTime:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  patientName:    z.string().min(1).max(100),
  patientSurname: z.string().max(100).optional(),
  patientEmail:   z.string().email(),
  patientPhone:   z.string().min(1).max(30),
  patientDOB:     z.string().optional(),
  patientGender:  z.string().max(50).optional(),
  notes:          z.string().max(500).optional(),
  recurrence:     z.object({
    frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY"]),
    sessions:  z.number().int().min(2).max(52),
  }).optional(),
})

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}

function nextDate(base: Date, frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY", index: number): Date {
  if (frequency === "WEEKLY")      return addDays(base, 7 * index)
  if (frequency === "FORTNIGHTLY") return addDays(base, 14 * index)
  return addMonths(base, index)
}

function parseDateOnly(value: string | undefined, label: string) {
  if (!value) return { date: null }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: `${label} must be YYYY-MM-DD.` }
  const date = new Date(value)
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { error: `Invalid ${label.toLowerCase()}.` }
  }
  return { date }
}

function startOfToday() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
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

function isWithinWindow(start: string, duration: number, windowStart: string, windowEnd: string) {
  const startMins = toMins(start)
  const endMins = startMins + duration
  return startMins >= toMins(windowStart) && endMins <= toMins(windowEnd)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId: scopedBranchId } = getScopeFromSession(session)

  const tenantRow = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      slug: true,
      manualBookingEnabled: true,
      branchModeEnabled: true,
      bookingAlertsEnabled: true,
      notificationEmail: true,
      clinicStartTime: true,
      clinicEndTime: true,
    },
  })
  if (!tenantRow?.manualBookingEnabled) {
    return Response.json({ error: "Manual booking is not enabled for this tenant." }, { status: 403 })
  }

  const body = await req.json()
  const parsed = manualCreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const {
    branchId: bodyBranchId,
    serviceId,
    doctorId,
    slotId,
    preferredDate,
    assignedDate,
    assignedTime,
    patientName,
    patientSurname,
    patientEmail,
    patientPhone,
    patientDOB,
    patientGender,
    notes,
    recurrence,
  } = parsed.data

  let resolvedBranchId = scopedBranchId ?? null
  if (tenantRow.branchModeEnabled && bodyBranchId && !scopedBranchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: bodyBranchId, tenantId, isActive: true },
      select: { id: true },
    })
    if (!branch) return Response.json({ error: "Invalid branch." }, { status: 400 })
    resolvedBranchId = branch.id
  }

  const assignmentRequested = Boolean(slotId || doctorId || assignedDate || assignedTime)
  if (assignmentRequested && (!doctorId || !assignedDate || !assignedTime)) {
    return Response.json({
      error: "Choose a clinician, confirmed date, and available time together, or leave them empty to create a pending request.",
    }, { status: 400 })
  }

  const preferredParsed = parseDateOnly(preferredDate, "Preferred date")
  if (preferredParsed.error) return Response.json({ error: preferredParsed.error }, { status: 400 })

  const assignedParsed = parseDateOnly(assignedDate, "Assigned date")
  if (assignedParsed.error) return Response.json({ error: assignedParsed.error }, { status: 400 })

  const today = startOfToday()
  const parsedPreferredDate = preferredParsed.date
  if (parsedPreferredDate && parsedPreferredDate < today) {
    return Response.json({ error: "Preferred date cannot be in the past." }, { status: 400 })
  }

  const parsedAssignedDate = assignedParsed.date
  if (parsedAssignedDate && parsedAssignedDate < today) {
    return Response.json({ error: "Assigned date cannot be in the past." }, { status: 400 })
  }

  const slot = slotId && doctorId && parsedAssignedDate && assignedTime
    ? await prisma.slot.findFirst({
        where: {
          id: slotId,
          tenantId,
          doctorId,
          isBooked: false,
          date: parsedAssignedDate,
          startTime: assignedTime,
          ...(resolvedBranchId ? { branchId: resolvedBranchId } : {}),
          OR: [{ serviceId }, { serviceId: null }],
        },
        select: {
          id: true,
          branchId: true,
          doctorId: true,
          serviceId: true,
          date: true,
          startTime: true,
          endTime: true,
          durationMins: true,
        },
      })
    : null

  if (slotId && !slot) {
    return Response.json({ error: "Selected slot is no longer available." }, { status: 409 })
  }

  if (!resolvedBranchId && slot?.branchId) resolvedBranchId = slot.branchId

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      tenantId,
      isActive: true,
      ...(resolvedBranchId
        ? {
            OR: [
              { branchConfigs: { none: { branchId: resolvedBranchId } } },
              { branchConfigs: { some: { branchId: resolvedBranchId, isOffered: true, isAvailable: true } } },
            ],
          }
        : {}),
    },
  })
  if (!service) return Response.json({ error: "Service is not available at the selected branch." }, { status: 400 })

  if (doctorId) {
    const doctor = await prisma.doctor.findFirst({
      where: {
        id: doctorId,
        tenantId,
        isActive: true,
        ...(resolvedBranchId ? { branchId: resolvedBranchId } : {}),
        doctorServices: { some: { serviceId } },
      },
      select: { id: true },
    })
    if (!doctor) {
      return Response.json({ error: "Clinician does not match the selected service and branch." }, { status: 400 })
    }
  }

  let dobIso: string | null = null
  if (patientDOB) {
    const dobParsed = parseDateOnly(patientDOB, "Date of birth")
    if (dobParsed.error || !dobParsed.date) return Response.json({ error: dobParsed.error ?? "Invalid date of birth." }, { status: 400 })
    const dob = dobParsed.date
    if (dob > today) return Response.json({ error: "Date of birth cannot be in the future." }, { status: 400 })
    dobIso = dob.toISOString()
  }

  const status = assignmentRequested ? "APPROVED" : "PENDING"
  const bookingRef = generateBookingRef()

  const appointmentData: Prisma.AppointmentUncheckedCreateInput = {
    tenantId,
    serviceId,
    branchId: resolvedBranchId,
    slotId: null,
    doctorId: slot?.doctorId ?? doctorId ?? null,
    preferredDate: parsedPreferredDate,
    assignedDate: slot?.date ?? parsedAssignedDate,
    assignedTime: slot?.startTime ?? assignedTime ?? null,
    patientName,
    patientSurname: patientSurname ?? null,
    patientEmail,
    patientPhone: encryptField(patientPhone)!,
    patientDOB: dobIso ? encryptField(dobIso) : null,
    patientGender: encryptField(patientGender),
    notes: encryptField(notes),
    attachmentData: null,
    attachmentName: null,
    bookingRef,
    cancelToken: generateCancelToken(),
    status,
    appointmentType: "MANUAL",
  }

  let appointment
  try {
    appointment = await prisma.$transaction(async (tx) => {
      let reservedSlot = slot
      if (assignmentRequested && doctorId && parsedAssignedDate && assignedTime) {
        const assignedDuration = reservedSlot?.durationMins ?? service.durationMins
        const clashes = await tx.appointment.findMany({
          where: {
            tenantId,
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

      if (assignmentRequested && !reservedSlot && doctorId && parsedAssignedDate && assignedTime) {
        const dayOfWeek = parsedAssignedDate.getUTCDay()
        const workingHours = await tx.workingHours.findFirst({
          where: { tenantId, doctorId, dayOfWeek, isActive: true },
          select: { startTime: true, endTime: true },
        })
        const rawStart = workingHours?.startTime ?? tenantRow.clinicStartTime ?? null
        const rawEnd = workingHours?.endTime ?? tenantRow.clinicEndTime ?? null
        if (!rawStart || !rawEnd) throw new Error("TIME_OUTSIDE_AVAILABILITY")

        const effectiveStart = tenantRow.clinicStartTime && toMins(tenantRow.clinicStartTime) > toMins(rawStart)
          ? tenantRow.clinicStartTime
          : rawStart
        const effectiveEnd = tenantRow.clinicEndTime && toMins(tenantRow.clinicEndTime) < toMins(rawEnd)
          ? tenantRow.clinicEndTime
          : rawEnd
        if (!isWithinWindow(assignedTime, service.durationMins, effectiveStart, effectiveEnd)) {
          throw new Error("TIME_OUTSIDE_AVAILABILITY")
        }

        reservedSlot = await tx.slot.create({
          data: {
            tenantId,
            branchId: resolvedBranchId,
            doctorId,
            serviceId,
            durationMins: service.durationMins,
            date: parsedAssignedDate,
            startTime: assignedTime,
            endTime: addMinutes(assignedTime, service.durationMins),
          },
          select: {
            id: true,
            branchId: true,
            doctorId: true,
            serviceId: true,
            date: true,
            startTime: true,
            endTime: true,
            durationMins: true,
          },
        })
      }
      if (reservedSlot) {
        const claimed = await tx.slot.updateMany({
          where: { id: reservedSlot.id, isBooked: false },
          data: { isBooked: true },
        })
        if (claimed.count !== 1) throw new Error("SLOT_UNAVAILABLE")
      }
      return tx.appointment.create({
        data: {
          ...appointmentData,
          slotId: reservedSlot?.id ?? null,
          doctorId: reservedSlot?.doctorId ?? appointmentData.doctorId,
          assignedDate: reservedSlot?.date ?? appointmentData.assignedDate,
          assignedTime: reservedSlot?.startTime ?? appointmentData.assignedTime,
        },
      })
    })
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_UNAVAILABLE") {
      return Response.json({ error: "Selected slot is no longer available." }, { status: 409 })
    }
    if (error instanceof Error && error.message === "TIME_OUTSIDE_AVAILABILITY") {
      return Response.json({ error: "Selected time is outside the clinician's availability." }, { status: 409 })
    }
    if (error instanceof Error && error.message === "TIME_UNAVAILABLE") {
      return Response.json({ error: "Clinician already has an appointment at that time." }, { status: 409 })
    }
    throw error
  }

  const [branch, doctor, tenantAdmin] = await Promise.all([
    resolvedBranchId ? prisma.branch.findUnique({ where: { id: resolvedBranchId } }) : Promise.resolve(null),
    appointment.doctorId ? prisma.doctor.findUnique({ where: { id: appointment.doctorId } }) : Promise.resolve(null),
    prisma.adminUser.findFirst({
      where: { tenantId, role: "TENANT_ADMIN" },
      select: { email: true },
    }),
  ])

  await recordAppointmentStatusChange({
    tenantId,
    appointmentId: appointment.id,
    toStatus: status,
    actor: {
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
    },
    note: "Manual appointment created",
    metadata: { appointmentType: "MANUAL" },
  })

  const tenant = { ...tenantRow, adminEmail: tenantAdmin?.email ?? null }
  const apptForEmail = {
    ...appointment,
    patientPhone,
    patientDOB: patientDOB ? new Date(patientDOB) : null,
    patientGender: patientGender ?? null,
    notes: notes ?? null,
    attachmentData: null,
    tenant,
    service,
    branch,
    slot,
    doctor,
  }

  await Promise.all([
    sendBookingAcknowledgement(apptForEmail),
    ...(tenant.bookingAlertsEnabled ? [sendAdminNewRequest(apptForEmail)] : []),
  ])

  // ── Recurrence: create remaining sessions ──────────────────────────────────
  if (recurrence && parsedAssignedDate && assignedTime && doctorId) {
    const { frequency, sessions } = recurrence
    const groupId = appointment.id // use first appointment id as group anchor

    // Update first appointment with series metadata
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { recurrenceGroupId: groupId, recurrenceIndex: 1, recurrenceTotal: sessions },
    })

    // Create sessions 2..N (index 1..N-1 offsets)
    const seriesData: Prisma.AppointmentUncheckedCreateInput[] = []
    for (let i = 1; i < sessions; i++) {
      const seriesDate = nextDate(parsedAssignedDate, frequency, i)
      seriesData.push({
        ...appointmentData,
        bookingRef:        generateBookingRef(),
        cancelToken:       generateCancelToken(),
        assignedDate:      seriesDate,
        slotId:            null,          // no slot for future dates — admin manages slots
        recurrenceGroupId: groupId,
        recurrenceIndex:   i + 1,
        recurrenceTotal:   sessions,
      })
    }

    if (seriesData.length > 0) {
      await prisma.appointment.createMany({ data: seriesData })
    }

    return Response.json({
      data:     { id: appointment.id, bookingRef: appointment.bookingRef },
      series:   { groupId, total: sessions, frequency },
    }, { status: 201 })
  }

  return Response.json({ data: { id: appointment.id, bookingRef: appointment.bookingRef } }, { status: 201 })
}
