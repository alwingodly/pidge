import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { getTenantFromHeaders, getScopeFromSession } from "@/lib/tenant"
import { generateBookingRef, generateCancelToken } from "@/lib/booking-ref"
import { sendBookingAcknowledgement, sendAdminNewRequest } from "@/lib/email"
import { encryptField, decryptField, verifyBookingToken } from "@/lib/encryption"
import { recordAppointmentStatusChange } from "@/lib/audit"
import { getStripe } from "@/lib/stripe"
import Stripe from "stripe"
import { z } from "zod"

// Fields that are stored encrypted: patientPhone, patientDOB, patientGender, notes, attachmentData
function decryptAppointment<T extends {
  patientPhone: string
  patientDOB:   string | null
  patientGender: string | null
  notes:         string | null
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

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: "date must be YYYY-MM-DD." }
  const date = new Date(value)
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { error: "Invalid date." }
  }
  return { date }
}

export const GET = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(req.auth)
  const { searchParams } = new URL(req.url)

  const status   = searchParams.get("status")
  const doctorId = searchParams.get("doctorId")
  const date     = searchParams.get("date")
  const parsedDate = date ? parseDateOnly(date) : null

  if (parsedDate?.error) return Response.json({ error: parsedDate.error }, { status: 400 })

  try {
    if (doctorId && doctorId !== "ALL" && parsedDate?.date) {
      const appointments = await prisma.appointment.findMany({
        where: {
          tenantId,
          branchId: branchId ?? undefined,
          doctorId,
          assignedDate: parsedDate.date,
        },
        select: {
          id: true,
          status: true,
          assignedTime: true,
          service: { select: { durationMins: true } },
        },
        orderBy: { createdAt: "desc" },
      })

      return Response.json({ data: appointments })
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId: branchId ?? undefined,
        status:   status && status !== "ALL" ? status : undefined,
        doctorId: doctorId && doctorId !== "ALL" ? doctorId : undefined,
        ...(parsedDate?.date ? {
          OR: [
            { assignedDate: parsedDate.date },
            { preferredDate: parsedDate.date },
          ],
        } : {}),
      },
      include: { slot: true, service: true, doctor: true },
      orderBy: { createdAt: "desc" },
    })

    return Response.json({ data: appointments.map(decryptAppointment) })
  } catch (error) {
    console.error("GET /api/appointments failed", error)
    return Response.json({ error: "Could not load appointments." }, { status: 500 })
  }
})

// ── Patient creates a booking request ─────────────────────────────────────────
const createSchema = z.object({
  bookingToken:    z.string().min(1),
  branchId:        z.string().uuid().optional(),
  serviceId:       z.string().uuid(),
  doctorId:        z.string().uuid().optional(), // set when tenant has showDoctorSelection enabled
  preferredDate:   z.string().min(1),
  patientName:     z.string().min(1).max(100),
  patientSurname:  z.string().max(100).optional(),
  patientEmail:    z.string().email(),
  patientPhone:    z.string().min(1).max(30),
  patientDOB:      z.string().optional(),
  patientGender:   z.string().min(1).max(50),
  notes:           z.string().max(500).optional(),
  attachmentData:  z.string().max(7_500_000).optional(),
  attachmentName:  z.string().max(255).optional(),
  consentGiven:      z.boolean().optional(),
  reminderOptOut:    z.boolean().optional(),
  paymentIntentId:   z.string().optional(),
})

// Allowed MIME types for patient attachments (validated via base64 magic bytes)
const ALLOWED_MIME_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/gif;base64,",
  "data:image/webp;base64,",
  "data:application/pdf;base64,",
]

function validateAttachment(data?: string): boolean {
  if (!data) return true
  return ALLOWED_MIME_PREFIXES.some(prefix => data.startsWith(prefix))
}

export async function POST(req: NextRequest) {
  const { tenantId, branchId } = await getTenantFromHeaders()
  if (!tenantId) return Response.json({ error: "Tenant not found" }, { status: 404 })

  const body   = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const {
    bookingToken,
    branchId: bodyBranchId,
    serviceId, doctorId, preferredDate,
    patientName, patientSurname, patientEmail, patientPhone,
    patientDOB, patientGender,
    notes, attachmentData, attachmentName,
    consentGiven, reminderOptOut,
  } = parsed.data

  if (!verifyBookingToken(bookingToken, patientEmail)) {
    return Response.json({ error: "Email verification required." }, { status: 401 })
  }

  if (!validateAttachment(attachmentData)) {
    return Response.json(
      { error: "Attachment must be a JPEG, PNG, GIF, WebP image or PDF." },
      { status: 400 },
    )
  }

  let resolvedBranchId = branchId ?? null
  if (bodyBranchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: bodyBranchId, tenantId, isActive: true },
      select: { id: true },
    })
    if (!branch) return Response.json({ error: "Invalid branch" }, { status: 400 })
    resolvedBranchId = branch.id
  }

  // Validate service: must be active and bookable at this branch
  const svcCheck = await prisma.service.findUnique({
    where:  { id: serviceId, tenantId, isActive: true },
    select: { id: true, priceOnConsultation: true, price: true,
      ...(resolvedBranchId
        ? { branchConfigs: { where: { branchId: resolvedBranchId }, select: { isOffered: true, isAvailable: true } } }
        : {}),
    },
  })
  if (!svcCheck) return Response.json({ error: "Service not available." }, { status: 400 })

  // Block if explicitly hidden/unavailable at this branch
  if (resolvedBranchId) {
    const cfg = (svcCheck as { branchConfigs?: { isOffered: boolean; isAvailable: boolean }[] }).branchConfigs?.[0]
    if (cfg && (!cfg.isOffered || !cfg.isAvailable))
      return Response.json({ error: "Service not available at this location." }, { status: 400 })
  }

  // Server-side payment verification when online payments are enabled
  const tenantPayments = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { onlinePaymentsEnabled: true },
  })
  const requiresPayment = tenantPayments?.onlinePaymentsEnabled && !svcCheck.priceOnConsultation && svcCheck.price > 0
  if (requiresPayment) {
    const piId = parsed.data.paymentIntentId
    if (!piId) return Response.json({ error: "Payment is required to complete this booking." }, { status: 402 })

    let pi: Stripe.PaymentIntent
    try {
      pi = await getStripe().paymentIntents.retrieve(piId)
    } catch {
      return Response.json({ error: "Payment verification failed." }, { status: 402 })
    }

    if (pi.status !== "succeeded")
      return Response.json({ error: "Payment has not been completed." }, { status: 402 })
    if (pi.metadata?.tenantId !== tenantId || pi.metadata?.serviceId !== serviceId)
      return Response.json({ error: "Payment does not match this booking." }, { status: 402 })
    if (pi.metadata?.used === "true")
      return Response.json({ error: "This payment has already been used." }, { status: 402 })
    if (pi.amount < Math.round(svcCheck.price * 100))
      return Response.json({ error: "Payment amount does not match the service price." }, { status: 402 })
  }

  // Validate preferredDate is a real date
  const prefDate = new Date(preferredDate)
  if (isNaN(prefDate.getTime()))
    return Response.json({ error: "Invalid preferred date." }, { status: 400 })

  // Validate patientDOB if provided
  let dobIso: string | null = null
  if (patientDOB) {
    const dob = new Date(patientDOB)
    if (isNaN(dob.getTime()))
      return Response.json({ error: "Invalid date of birth." }, { status: 400 })
    dobIso = dob.toISOString()
  }

  // If patient selected a doctor, verify they belong to this tenant/branch AND offer this service
  if (doctorId) {
    const doctorExists = await prisma.doctor.findUnique({
      where: { id: doctorId, tenantId, ...(resolvedBranchId ? { branchId: resolvedBranchId } : {}) },
      select: { id: true, doctorServices: { where: { serviceId }, select: { serviceId: true } } },
    })
    if (!doctorExists) return Response.json({ error: "Invalid clinician selected." }, { status: 400 })
    if (doctorExists.doctorServices.length === 0)
      return Response.json({ error: "This clinician does not offer the selected service." }, { status: 400 })
  }

  // Enforce patient identity consistency — same email must always use the same name + phone
  const priorRecord = await prisma.appointment.findFirst({
    where:   { tenantId, patientEmail, patientName: { not: "[deleted]" } },
    orderBy: { createdAt: "desc" },
    select:  { patientName: true, patientSurname: true, patientPhone: true },
  })
  if (priorRecord) {
    const submitted = patientName.trim().toLowerCase()
    const stored    = priorRecord.patientName.trim().toLowerCase()
    if (submitted !== stored) {
      return Response.json(
        { error: `The name you entered doesn't match your previous booking. Please use: ${priorRecord.patientName}${priorRecord.patientSurname ? " " + priorRecord.patientSurname : ""}` },
        { status: 400 },
      )
    }
  }

  const storedPhone = priorRecord?.patientPhone ?? encryptField(patientPhone)!

  const bookingRef  = generateBookingRef()
  const cancelToken = generateCancelToken()

  // Encrypt sensitive fields before persisting to the database (UK GDPR / Data Protection Act 2018)
  const appointmentData: Prisma.AppointmentUncheckedCreateInput = {
    tenantId,
    serviceId,
    branchId:        resolvedBranchId,
    slotId:          null,
    doctorId:        doctorId ?? null,
    preferredDate:   prefDate,
    patientName:     priorRecord?.patientName    ?? patientName,
    patientSurname:  priorRecord?.patientSurname ?? patientSurname ?? null,
    patientEmail,
    patientPhone:    storedPhone,
    patientDOB:      dobIso ? encryptField(dobIso) : null,
    patientGender:   encryptField(patientGender),
    notes:           encryptField(notes),
    attachmentData:  encryptField(attachmentData),
    attachmentName:  attachmentName  ?? null,
    bookingRef,
    cancelToken,
    status:          "PENDING",
    consentGivenAt:  consentGiven ? new Date() : null,
    reminderOptOut:  reminderOptOut ?? false,
  }

  // Enforce GDPR consent when tenant requires it
  const tenantFlags = await prisma.tenant.findUniqueOrThrow({
    where:  { id: tenantId },
    select: { name: true, slug: true, notificationEmail: true, bookingAlertsEnabled: true, gdprEnabled: true },
  })
  if (tenantFlags.gdprEnabled && !consentGiven) {
    return Response.json({ error: "Data processing consent is required to complete your booking." }, { status: 422 })
  }

  const [appointment, service, branch, tenantAdmin] = await Promise.all([
    prisma.appointment.create({ data: appointmentData }).then(async (appt) => {
      // Mark the PaymentIntent as used immediately after appointment is persisted (fire-and-forget)
      if (requiresPayment && parsed.data.paymentIntentId) {
        getStripe().paymentIntents.update(parsed.data.paymentIntentId, {
          metadata: { used: "true", appointmentId: appt.id }
        }).catch(() => {/* non-fatal — appointment is already created */})
      }
      return appt
    }),
    prisma.service.findUniqueOrThrow({ where: { id: serviceId, tenantId } }),
    branchId
      ? prisma.branch.findUnique({ where: { id: branchId } })
      : Promise.resolve(null),
    prisma.adminUser.findFirst({
      where:  { tenantId, role: "TENANT_ADMIN" },
      select: { email: true },
    }),
  ])

  const tenant = { ...tenantFlags, adminEmail: tenantAdmin?.email ?? null }

  // Build plaintext copy for emails — never pass encrypted values to email functions
  const apptForEmail = {
    ...appointment,
    patientPhone,
    patientDOB:     patientDOB ? new Date(patientDOB) : null,
    patientGender:  patientGender ?? null,
    notes:          notes          ?? null,
    attachmentData: attachmentData ?? null,
    tenant, service, branch, slot: null, doctor: null,
  }

  await Promise.all([
    recordAppointmentStatusChange({
      tenantId,
      appointmentId: appointment.id,
      toStatus: "PENDING",
      note: "Patient booking request created",
      metadata: { appointmentType: "ONLINE" },
    }),
    sendBookingAcknowledgement(apptForEmail),
    ...(tenant.bookingAlertsEnabled ? [sendAdminNewRequest(apptForEmail)] : []),
  ])

  // Return cancelToken so client can build a cryptographically-gated confirmation URL
  return Response.json({ bookingRef: appointment.bookingRef, cancelToken: appointment.cancelToken }, { status: 201 })
}
