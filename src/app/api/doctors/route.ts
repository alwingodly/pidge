import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { tenantId, branchId } = getScopeFromSession(session)
  const { searchParams } = new URL(req.url)
  const serviceId      = searchParams.get("serviceId")
  const filterBranchId = searchParams.get("branchId") // explicit branch filter (e.g. from assign dialog)

  const doctors = await prisma.doctor.findMany({
    where: {
      tenantId,
      // explicit query param wins → then session scope → then no filter (tenant admin)
      branchId: filterBranchId ?? branchId ?? undefined,
      isActive: true,
      ...(serviceId ? { doctorServices: { some: { serviceId } } } : {}),
    },
    include: { doctorServices: { include: { service: true } } },
    orderBy: { name: "asc" },
  })

  return Response.json({ data: doctors })
}

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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { tenantId } = getScopeFromSession(session)

  const body   = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  const { serviceIds, ...doctorData } = parsed.data

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
}
