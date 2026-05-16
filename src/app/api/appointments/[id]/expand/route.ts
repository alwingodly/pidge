import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { generateBookingRef, generateCancelToken } from "@/lib/booking-ref"
import { z } from "zod"

const schema = z.object({
  sessions: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
  })).min(1).max(60),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || !["TENANT_ADMIN", "BRANCH_ADMIN"].includes(session.user.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { tenantId, branchId } = getScopeFromSession(session)
  const { id } = await params

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  // Fetch the original appointment
  const original = await prisma.appointment.findUnique({
    where:  { id, tenantId, ...(branchId ? { branchId } : {}) },
    select: {
      id: true, status: true, doctorId: true, serviceId: true,
      branchId: true, recurrenceGroupId: true,
      patientName: true, patientSurname: true, patientEmail: true,
      patientPhone: true, patientDOB: true, patientGender: true, notes: true,
      assignedDate: true, assignedTime: true,
      service: { select: { durationMins: true } },
    },
  })

  if (!original) return Response.json({ error: "Appointment not found." }, { status: 404 })
  if (original.recurrenceGroupId) {
    return Response.json({ error: "This appointment is already part of a programme." }, { status: 409 })
  }
  if (!original.doctorId || !original.assignedDate || !original.assignedTime) {
    return Response.json({ error: "Appointment must be assigned to a clinician with a confirmed date and time." }, { status: 400 })
  }

  const { sessions } = parsed.data
  const total        = sessions.length + 1 // original + new sessions
  const groupId      = crypto.randomUUID()

  // Conflict check across new session dates
  function toMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m }
  function overlaps(s: string, dur: number, es: string, edur: number) {
    return toMins(s) < toMins(es) + edur && toMins(s) + dur > toMins(es)
  }
  const dur = original.service.durationMins

  const sessionDates = sessions.map(s => new Date(s.date + "T00:00:00.000Z"))
  const existingAppts = await prisma.appointment.findMany({
    where: {
      doctorId:     original.doctorId,
      tenantId,
      status:       { in: ["PENDING", "APPROVED"] },
      id:           { not: original.id },
      assignedDate: { gte: sessionDates[0], lte: sessionDates[sessionDates.length - 1] },
      assignedTime: { not: null },
    },
    select: { assignedDate: true, assignedTime: true, service: { select: { durationMins: true } } },
  })

  const conflicts: string[] = []
  for (const sess of sessions) {
    const dayAppts = existingAppts.filter(a => a.assignedDate?.toISOString().slice(0, 10) === sess.date)
    if (dayAppts.some(a => a.assignedTime && overlaps(sess.time, dur, a.assignedTime, a.service?.durationMins ?? dur))) {
      conflicts.push(`${sess.date} ${sess.time}`)
    }
  }
  if (conflicts.length > 0) {
    return Response.json({ error: `Conflicts found: ${conflicts.join(", ")}. Please adjust those sessions.` }, { status: 409 })
  }

  // Create additional sessions + update original in a transaction
  const additionalData: Prisma.AppointmentUncheckedCreateInput[] = sessions.map((sess, i) => ({
    tenantId,
    branchId:          original.branchId,
    serviceId:         original.serviceId,
    doctorId:          original.doctorId!,
    slotId:            null,
    bookingRef:        generateBookingRef(),
    cancelToken:       generateCancelToken(),
    patientName:       original.patientName,
    patientSurname:    original.patientSurname,
    patientEmail:      original.patientEmail,
    patientPhone:      original.patientPhone,
    patientDOB:        original.patientDOB,
    patientGender:     original.patientGender,
    notes:             original.notes,
    attachmentData:    null,
    attachmentName:    null,
    assignedDate:      new Date(sess.date + "T00:00:00.000Z"),
    assignedTime:      sess.time,
    status:            "APPROVED",
    appointmentType:   "ONLINE",
    recurrenceGroupId: groupId,
    recurrenceIndex:   i + 2,
    recurrenceTotal:   total,
    reminderSent:      false,
    reminderOptOut:    false,
  }))

  await prisma.$transaction([
    // Update original appointment as session 1
    prisma.appointment.update({
      where: { id: original.id },
      data:  { recurrenceGroupId: groupId, recurrenceIndex: 1, recurrenceTotal: total },
    }),
    // Create additional sessions
    prisma.appointment.createMany({ data: additionalData }),
  ])

  return Response.json({ data: { groupId, total } }, { status: 201 })
}
