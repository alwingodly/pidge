import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { generateBookingRef, generateCancelToken } from "@/lib/booking-ref"
import { sendProgrammeConfirmation } from "@/lib/email"
import { z } from "zod"

const schema = z.object({
  doctorId: z.string().uuid(),
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

  const { doctorId, sessions } = parsed.data

  const original = await prisma.appointment.findUnique({
    where:  { id, tenantId, ...(branchId ? { branchId } : {}) },
    select: {
      id: true, status: true, serviceId: true,
      branchId: true, recurrenceGroupId: true,
      patientName: true, patientSurname: true, patientEmail: true,
      patientPhone: true, patientDOB: true, patientGender: true, notes: true,
      service: { select: { durationMins: true, name: true } },
    },
  })

  if (!original)
    return Response.json({ error: "Appointment not found." }, { status: 404 })
  if (original.status !== "PENDING")
    return Response.json({ error: "Only PENDING appointments can be approved as a programme." }, { status: 409 })
  if (original.recurrenceGroupId)
    return Response.json({ error: "Already part of a programme." }, { status: 409 })

  const doctor = await prisma.doctor.findUnique({
    where:  { id: doctorId, tenantId, ...(branchId ? { branchId } : {}) },
    select: { id: true, name: true },
  })
  if (!doctor) return Response.json({ error: "Invalid clinician." }, { status: 400 })

  const total   = sessions.length
  const groupId = crypto.randomUUID()
  const dur     = original.service.durationMins

  function toMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m }
  function overlaps(s: string, d: number, es: string, ed: number) {
    return toMins(s) < toMins(es) + ed && toMins(s) + d > toMins(es)
  }

  const sessionDates = sessions.map(s => new Date(s.date + "T00:00:00.000Z"))
  const existingAppts = await prisma.appointment.findMany({
    where: {
      doctorId, tenantId,
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
      conflicts.push(`${sess.date} at ${sess.time}`)
    }
  }
  if (conflicts.length > 0) {
    return Response.json(
      { error: `Conflicts found: ${conflicts.join(", ")}. Please adjust the schedule.` },
      { status: 409 }
    )
  }

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: original.id },
      data:  {
        status:            "APPROVED",
        doctorId,
        assignedDate:      new Date(sessions[0].date + "T00:00:00.000Z"),
        assignedTime:      sessions[0].time,
        recurrenceGroupId: groupId,
        recurrenceIndex:   1,
        recurrenceTotal:   total,
      },
    }),
    ...sessions.slice(1).map((sess, i) =>
      prisma.appointment.create({
        data: {
          tenantId,
          branchId:          original.branchId,
          serviceId:         original.serviceId,
          doctorId,
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
        },
      })
    ),
  ])

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { name: true, assignmentEmailEnabled: true },
  })

  if (tenant?.assignmentEmailEnabled) {
    try {
      await sendProgrammeConfirmation(
        original.patientEmail,
        original.patientName,
        original.service.name,
        tenant.name,
        doctor.name,
        sessions,
      )
    } catch (e) {
      console.error("[approve-programme] email failed", e)
    }
  }

  return Response.json({ data: { groupId, total } }, { status: 201 })
}
