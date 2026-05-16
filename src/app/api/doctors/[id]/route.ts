import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

const PRACTITIONER_TYPES = ["VAIDYA", "THERAPIST", "CONSULTANT", "OTHER"] as const

const updateSchema = z.object({
  name:             z.string().min(1).optional(),
  practitionerType: z.enum(PRACTITIONER_TYPES).optional(),
  speciality:       z.string().min(1).optional(),
  bio:              z.string().optional(),
  photoUrl:         z.string().optional(),
  branchId:         z.string().nullable().optional(),
  isActive:         z.boolean().optional(),
  showInBooking:    z.boolean().optional(),
  serviceIds:       z.array(z.string()).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(session)
  const { id } = await params

  const body   = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  const { serviceIds, branchId: bodyBranchId, ...rest } = parsed.data

  // Branch admins can only keep or set their own branch
  const resolvedBranchId: string | null | undefined = bodyBranchId
  if (branchId && bodyBranchId !== undefined) {
    // Branch admin: only allowed to set their own branchId or keep it (null not allowed)
    if (bodyBranchId !== branchId) return Response.json({ error: "Invalid branch." }, { status: 400 })
  } else if (!branchId && bodyBranchId) {
    // Tenant admin: validate submitted branchId belongs to tenant
    const branch = await prisma.branch.findUnique({ where: { id: bodyBranchId, tenantId }, select: { id: true } })
    if (!branch) return Response.json({ error: "Invalid branch." }, { status: 400 })
  }

  // Validate serviceIds belong to this tenant
  if (serviceIds && serviceIds.length > 0) {
    const count = await prisma.service.count({ where: { id: { in: serviceIds }, tenantId } })
    if (count !== serviceIds.length) return Response.json({ error: "Invalid service selection." }, { status: 400 })
  }

  const doctorData = bodyBranchId !== undefined ? { ...rest, branchId: resolvedBranchId } : rest

  const doctor = await prisma.$transaction(async (tx) => {
    await tx.doctor.update({ where: { id, tenantId, ...(branchId ? { branchId } : {}) }, data: doctorData })

    if (serviceIds !== undefined) {
      // Replace all services atomically
      await tx.doctorService.deleteMany({ where: { doctorId: id } })
      if (serviceIds.length > 0) {
        await tx.doctorService.createMany({
          data: serviceIds.map((serviceId) => ({ doctorId: id, serviceId })),
        })
      }
    }

    return tx.doctor.findUnique({
      where: { id },
      include: { doctorServices: { include: { service: true } } },
    })
  })

  return Response.json({ data: doctor })
}
