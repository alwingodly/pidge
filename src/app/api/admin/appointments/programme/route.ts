import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { generateBookingRef, generateCancelToken } from "@/lib/booking-ref"
import { encryptField } from "@/lib/encryption"
import { z } from "zod"

const schema = z.object({
  branchId:       z.string().uuid().optional(),
  serviceId:      z.string().uuid(),
  doctorId:       z.string().uuid(),
  patientName:    z.string().min(1).max(100),
  patientSurname: z.string().max(100).optional(),
  patientEmail:   z.string().email(),
  patientPhone:   z.string().min(1).max(30),
  patientDOB:     z.string().optional(),
  patientGender:  z.string().max(50).optional(),
  notes:          z.string().max(500).optional(),
  sessions: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
  })).min(1).max(60),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !["TENANT_ADMIN", "BRANCH_ADMIN"].includes(session.user.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { tenantId, branchId } = getScopeFromSession(session)

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const {
    serviceId, doctorId, sessions,
    patientName, patientSurname, patientEmail, patientPhone,
    patientDOB, patientGender, notes,
    branchId: bodyBranchId,
  } = parsed.data

  const resolvedBranchId = branchId ?? bodyBranchId ?? null

  // Validate doctor belongs to this tenant and branch (branch admins are scoped)
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId, tenantId, ...(branchId ? { branchId } : {}) },
    select: { id: true },
  })
  if (!doctor) return Response.json({ error: "Invalid clinician." }, { status: 400 })

  const service = await prisma.service.findUnique({
    where:  { id: serviceId, tenantId },
    select: { durationMins: true },
  })
  if (!service) return Response.json({ error: "Service not found." }, { status: 400 })

  // Final conflict check across all session dates
  const sessionDates  = sessions.map(s => new Date(s.date + "T00:00:00.000Z"))
  const existingAppts = await prisma.appointment.findMany({
    where: {
      doctorId, tenantId,
      status:       { in: ["PENDING", "APPROVED"] },
      assignedDate: { gte: sessionDates[0], lte: sessionDates[sessionDates.length - 1] },
      assignedTime: { not: null },
    },
    select: {
      assignedDate: true,
      assignedTime: true,
      service:      { select: { durationMins: true } },
    },
  })

  function toMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m }
  function overlaps(s: string, dur: number, es: string, edur: number) {
    const aS = toMins(s), aE = aS + dur, bS = toMins(es), bE = bS + edur
    return aS < bE && aE > bS
  }

  const conflicts: string[] = []
  for (const sess of sessions) {
    const dateStr  = sess.date
    const dayAppts = existingAppts.filter(a => a.assignedDate?.toISOString().slice(0, 10) === dateStr)
    const conflict = dayAppts.some(a =>
      a.assignedTime && overlaps(sess.time, service.durationMins, a.assignedTime, a.service?.durationMins ?? service.durationMins)
    )
    if (conflict) conflicts.push(`${dateStr} ${sess.time}`)
  }

  if (conflicts.length > 0) {
    return Response.json({
      error: `Conflicts found on: ${conflicts.join(", ")}. Please adjust those sessions.`,
    }, { status: 409 })
  }

  // Encrypt PII
  const encPhone  = encryptField(patientPhone)!
  const encDOB    = patientDOB    ? encryptField(patientDOB)    : null
  const encGender = patientGender ? encryptField(patientGender) : null
  const encNotes  = notes         ? encryptField(notes)         : null

  const groupId = crypto.randomUUID()
  const total   = sessions.length

  const appointmentsData: Prisma.AppointmentUncheckedCreateInput[] = sessions.map((sess, i) => ({
    tenantId,
    branchId:          resolvedBranchId,
    serviceId,
    doctorId,
    slotId:            null,
    bookingRef:        generateBookingRef(),
    cancelToken:       generateCancelToken(),
    patientName,
    patientSurname:    patientSurname  ?? null,
    patientEmail,
    patientPhone:      encPhone,
    patientDOB:        encDOB,
    patientGender:     encGender,
    notes:             encNotes,
    attachmentData:    null,
    attachmentName:    null,
    assignedDate:      new Date(sess.date + "T00:00:00.000Z"),
    assignedTime:      sess.time,
    status:            "APPROVED",
    appointmentType:   "ONLINE",
    recurrenceGroupId: groupId,
    recurrenceIndex:   i + 1,
    recurrenceTotal:   total,
    reminderSent:      false,
    reminderOptOut:    false,
  }))

  await prisma.appointment.createMany({ data: appointmentsData })

  return Response.json({
    data: { groupId, total },
  }, { status: 201 })
}
