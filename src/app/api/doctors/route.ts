import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession, getTenantFromHeaders } from "@/lib/tenant"
import { z } from "zod"

export const GET = auth(async (req) => {
  let tenantId: string
  let adminBranchId: string | null = null // strict scope for branch admins only

  if (req.auth) {
    ;({ tenantId, branchId: adminBranchId } = getScopeFromSession(req.auth))
  } else {
    const t = await getTenantFromHeaders()
    if (!t.tenantId) return Response.json({ error: "Tenant not found" }, { status: 404 })
    tenantId = t.tenantId
    // t.branchId here is patient context from headers — NOT a strict admin scope
  }

  const { searchParams } = new URL(req.url)
  const serviceId        = searchParams.get("serviceId")
  const filterBranchId   = searchParams.get("branchId")

  // Branch admins: strict to their branch only.
  // Patients (filterBranchId from query): include that branch + unassigned doctors (branchId = null).
  // No branch filter: return all doctors for the tenant.
  const branchFilter = adminBranchId
    ? { branchId: adminBranchId }
    : filterBranchId
    ? { OR: [{ branchId: filterBranchId }, { branchId: null }] }
    : {}

  // Patient-facing booking flow: only return doctors set as visible in booking.
  // Applies when unauthenticated OR when the booking page explicitly passes ?booking=1
  // (covers the case where an admin tests the booking flow while still logged in).
  const isBookingContext = !req.auth || searchParams.get("booking") === "1"
  const bookingFilter = isBookingContext ? { showInBooking: true } : {}

  const doctors = await prisma.doctor.findMany({
    where: {
      tenantId,
      ...branchFilter,
      ...bookingFilter,
      isActive: true,
      ...(serviceId ? { doctorServices: { some: { serviceId } } } : {}),
    },
    include: { doctorServices: { include: { service: true } } },
    orderBy: { name: "asc" },
  })

  return Response.json({ data: doctors })
})

const PRACTITIONER_TYPES = ["VAIDYA", "THERAPIST", "CONSULTANT", "OTHER"] as const

const createSchema = z.object({
  name:             z.string().min(1),
  practitionerType: z.enum(PRACTITIONER_TYPES).default("VAIDYA"),
  speciality:       z.string().min(1),
  bio:              z.string().optional(),
  photoUrl:         z.url().optional(),
  branchId:         z.uuid().optional(),
  serviceIds:       z.array(z.uuid()).default([]),
  showInBooking:    z.boolean().default(true),
})

export const POST = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { tenantId, branchId } = getScopeFromSession(req.auth)

  const body   = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  const { serviceIds, branchId: bodyBranchId, showInBooking, ...rest } = parsed.data

  // Branch admins must use their own branch; tenant admins validate submitted branchId
  let resolvedBranchId: string | undefined = bodyBranchId
  if (branchId) {
    resolvedBranchId = branchId
  } else if (bodyBranchId) {
    const branch = await prisma.branch.findUnique({ where: { id: bodyBranchId, tenantId }, select: { id: true } })
    if (!branch) return Response.json({ error: "Invalid branch." }, { status: 400 })
  }

  // Validate all serviceIds belong to this tenant
  if (serviceIds.length > 0) {
    const count = await prisma.service.count({ where: { id: { in: serviceIds }, tenantId } })
    if (count !== serviceIds.length) return Response.json({ error: "Invalid service selection." }, { status: 400 })
  }

  const doctorData = { ...rest, branchId: resolvedBranchId, showInBooking }

  const doctor = await prisma.$transaction(async (tx) => {
    const doc = await tx.doctor.create({ data: { tenantId, ...doctorData } })
    if (serviceIds.length > 0) {
      await tx.doctorService.createMany({
        data: serviceIds.map((serviceId) => ({ doctorId: doc.id, serviceId })),
      })
    }
    return tx.doctor.findUnique({
      where:   { id: doc.id },
      include: { doctorServices: { include: { service: true } } },
    })
  })

  return Response.json({ data: doctor }, { status: 201 })
})
