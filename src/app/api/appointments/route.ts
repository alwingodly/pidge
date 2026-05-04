import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { getTenantFromHeaders, getScopeFromSession } from "@/lib/tenant"
import { generateBookingRef, generateCancelToken } from "@/lib/booking-ref"
import { sendBookingAcknowledgement, sendAdminNewRequest } from "@/lib/email"
import { z } from "zod"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(session)
  const { searchParams } = new URL(req.url)

  const status   = searchParams.get("status")
  const doctorId = searchParams.get("doctorId")
  const date     = searchParams.get("date")

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      branchId: branchId ?? undefined,
      status:   status && status !== "ALL" ? status : undefined,
      doctorId: doctorId && doctorId !== "ALL" ? doctorId : undefined,
      ...(date ? {
        OR: [
          { assignedDate: new Date(date) },
          { preferredDate: new Date(date) },
        ],
      } : {}),
    },
    include: { slot: true, service: true, doctor: true },
    orderBy: { createdAt: "desc" },
  })
  return Response.json({ data: appointments })
}

// ── Patient creates a booking request ─────────────────────────────────────────
const createSchema = z.object({
  branchId:        z.string().uuid().optional(),
  serviceId:       z.string().uuid(),
  preferredDate:   z.string().min(1),
  patientName:     z.string().min(1),
  patientSurname:  z.string().optional(),
  patientEmail:    z.string().email(),
  patientPhone:    z.string().min(1),
  patientAddress:  z.string().optional(),
  patientPostcode: z.string().optional(),
  patientCity:     z.string().optional(),
  patientDOB:      z.string().optional(),
  patientGender:   z.string().optional(),
  notes:           z.string().max(500).optional(),
  attachmentData:  z.string().max(7_500_000).optional(),
  attachmentName:  z.string().max(255).optional(),
})

export async function POST(req: NextRequest) {
  const { tenantId, branchId } = await getTenantFromHeaders()
  if (!tenantId) return Response.json({ error: "Tenant not found" }, { status: 404 })

  const body   = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const {
    branchId: bodyBranchId,
    serviceId, preferredDate,
    patientName, patientSurname, patientEmail, patientPhone,
    patientAddress, patientPostcode, patientCity, patientDOB, patientGender,
    notes, attachmentData, attachmentName,
  } = parsed.data

  // Body branchId takes priority (patient chose a branch in the form).
  // Validate it belongs to this tenant so it can't be spoofed.
  let resolvedBranchId = branchId ?? null
  if (bodyBranchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: bodyBranchId, tenantId, isActive: true },
      select: { id: true },
    })
    if (!branch) return Response.json({ error: "Invalid branch" }, { status: 400 })
    resolvedBranchId = branch.id
  }

  const bookingRef  = await generateBookingRef(prisma as never)
  const cancelToken = generateCancelToken()

  // Explicitly type as UncheckedCreateInput so Prisma accepts scalar IDs
  // without demanding relation objects for every association.
  const appointmentData: Prisma.AppointmentUncheckedCreateInput = {
    tenantId,
    serviceId,
    branchId:        resolvedBranchId,
    slotId:          null,
    doctorId:        null,
    preferredDate:   new Date(preferredDate),
    patientName,
    patientSurname:  patientSurname  ?? null,
    patientEmail,
    patientPhone,
    patientAddress:  patientAddress  ?? null,
    patientPostcode: patientPostcode ?? null,
    patientCity:     patientCity     ?? null,
    patientDOB:      patientDOB      ? new Date(patientDOB) : null,
    patientGender:   patientGender   ?? null,
    notes:           notes           ?? null,
    attachmentData:  attachmentData  ?? null,
    attachmentName:  attachmentName  ?? null,
    bookingRef,
    cancelToken,
    status: "PENDING",
  }

  const [appointment, tenant, service, branch] = await Promise.all([
    prisma.appointment.create({ data: appointmentData }),
    prisma.tenant.findUniqueOrThrow({
      where:  { id: tenantId },
      select: { name: true, slug: true },
    }),
    prisma.service.findUniqueOrThrow({
      where: { id: serviceId },
    }),
    branchId
      ? prisma.branch.findUnique({ where: { id: branchId } })
      : Promise.resolve(null),
  ])

  const appt = { ...appointment, tenant, service, branch, slot: null, doctor: null }
  await Promise.all([
    sendBookingAcknowledgement(appt),
    sendAdminNewRequest(appt),
  ])

  return Response.json({ bookingRef: appointment.bookingRef }, { status: 201 })
}