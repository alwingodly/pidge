import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession, getTenantFromHeaders } from "@/lib/tenant"
import { z } from "zod"

export const GET = auth(async (req) => {
  let tenantId: string
  let branchId: string | null

  if (req.auth) {
    ;({ tenantId, branchId } = getScopeFromSession(req.auth))
  } else {
    const t = await getTenantFromHeaders()
    if (!t.tenantId) return Response.json({ error: "Tenant not found" }, { status: 404 })
    tenantId = t.tenantId
    branchId = t.branchId
  }

  const { searchParams }       = new URL(req.url)
  const serviceId              = searchParams.get("serviceId")
  const filterBranchId         = searchParams.get("branchId")

  // Session branchId (branch admins) takes precedence over query param to prevent scope bypass
  const effectiveBranchId = branchId ?? filterBranchId ?? undefined

  const doctors = await prisma.doctor.findMany({
    where: {
      tenantId,
      branchId: effectiveBranchId,
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
})

export const POST = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { tenantId, branchId } = getScopeFromSession(req.auth)

  const body   = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  const { serviceIds, branchId: bodyBranchId, ...rest } = parsed.data

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

  const doctorData = { ...rest, branchId: resolvedBranchId }

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
