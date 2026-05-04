import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

const updateSchema = z.object({
  name:       z.string().min(1).optional(),
  speciality: z.string().min(1).optional(),
  bio:        z.string().optional(),
  photoUrl:   z.string().optional(),
  branchId:   z.string().nullable().optional(),
  isActive:   z.boolean().optional(),
  serviceIds: z.array(z.string()).optional(), // full replacement of services
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId } = getScopeFromSession(session)
  const { id } = await params

  const body   = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { serviceIds, ...doctorData } = parsed.data

  const doctor = await prisma.$transaction(async (tx) => {
    await tx.doctor.update({ where: { id, tenantId }, data: doctorData })

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
