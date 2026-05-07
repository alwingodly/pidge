import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { sendAssignmentConfirmation, sendCancellationEmail, sendRescheduleEmail, sendReviewRequestEmail } from "@/lib/email"
import { decryptField } from "@/lib/encryption"
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

export const GET = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(req.auth)
  const id = idFromUrl(req.url)

  const appointment = await prisma.appointment.findUnique({
    where:   { id, tenantId, ...(branchId ? { branchId } : {}) },
    include: { slot: true, service: true, doctor: true, branch: true },
  })
  if (!appointment) return Response.json({ error: "Not found" }, { status: 404 })
  return Response.json({ data: decryptAppointment(appointment) })
})

const patchSchema = z.object({
  status:           z.enum(["APPROVED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
  doctorId:         z.string().uuid().optional(),
  assignedDate:     z.string().optional(),
  assignedTime:     z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reschedule:       z.boolean().optional(), // true when rescheduling an already-confirmed appointment
  previousDate:     z.string().optional(),  // previous assignedDate for reschedule email
  previousTime:     z.string().optional(),  // previous assignedTime for reschedule email
})

export const PATCH = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(req.auth)
  const id = idFromUrl(req.url)

  const body   = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { status, doctorId, assignedDate, assignedTime, reschedule, previousDate, previousTime } = parsed.data

  // Validate assignedDate is a real date
  let parsedAssignedDate: Date | undefined
  if (assignedDate) {
    parsedAssignedDate = new Date(assignedDate)
    if (isNaN(parsedAssignedDate.getTime()))
      return Response.json({ error: "Invalid assignedDate." }, { status: 400 })
  }

  // Verify the doctor being assigned belongs to this tenant (and branch for branch admins)
  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({
      where:  { id: doctorId, tenantId, ...(branchId ? { branchId } : {}) },
      select: { id: true },
    })
    if (!doctor) return Response.json({ error: "Invalid clinician." }, { status: 400 })
  }

  const appointment = await prisma.appointment.update({
    where: { id, tenantId, ...(branchId ? { branchId } : {}) },
    data:  {
      status,
      ...(status === "APPROVED" && doctorId           ? { doctorId }                    : {}),
      ...(status === "APPROVED" && parsedAssignedDate ? { assignedDate: parsedAssignedDate } : {}),
      ...(status === "APPROVED" && assignedTime       ? { assignedTime }                 : {}),
    },
    include: { slot: true, service: true, doctor: true, tenant: true, branch: true },
  })

  if (status === "CANCELLED" && appointment.slotId) {
    await prisma.slot.update({
      where: { id: appointment.slotId },
      data:  { isBooked: false },
    }).catch(() => null)
  }

  const decrypted = decryptAppointment(appointment)
  if (status === "APPROVED" && reschedule && previousDate && previousTime)
    await sendRescheduleEmail(decrypted, previousDate, previousTime)
  else if (status === "APPROVED")
    await sendAssignmentConfirmation(decrypted)
  if (status === "CANCELLED") await sendCancellationEmail(decrypted)
  if (status === "COMPLETED" && appointment.tenant.reviewLink)
    await sendReviewRequestEmail(decrypted, appointment.tenant.reviewLink)

  return Response.json({ data: decrypted })
})
