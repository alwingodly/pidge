import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { sendAssignmentConfirmation, sendCancellationEmail } from "@/lib/email"
import { z } from "zod"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId } = getScopeFromSession(session)
  const { id } = await params

  const appointment = await prisma.appointment.findUnique({
    where:   { id, tenantId },
    include: { slot: true, service: true, doctor: true, branch: true },
  })
  if (!appointment) return Response.json({ error: "Not found" }, { status: 404 })
  return Response.json({ data: appointment })
}

const patchSchema = z.object({
  status:       z.enum(["APPROVED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
  // Admin assignment fields — only used when status = APPROVED
  doctorId:     z.string().uuid().optional(),
  assignedDate: z.string().optional(),   // ISO date string "2026-05-08"
  assignedTime: z.string().optional(),   // "10:30"
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId } = getScopeFromSession(session)
  const { id } = await params

  const body   = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { status, doctorId, assignedDate, assignedTime } = parsed.data

  const appointment = await prisma.appointment.update({
    where: { id, tenantId },
    data:  {
      status,
      ...(status === "APPROVED" && doctorId    ? { doctorId }                          : {}),
      ...(status === "APPROVED" && assignedDate ? { assignedDate: new Date(assignedDate) } : {}),
      ...(status === "APPROVED" && assignedTime ? { assignedTime }                     : {}),
    },
    include: { slot: true, service: true, doctor: true, tenant: true, branch: true },
  })

  // Free the slot if one was linked (legacy flow) and we're cancelling
  if (status === "CANCELLED" && appointment.slotId) {
    await prisma.slot.update({
      where: { id: appointment.slotId },
      data:  { isBooked: false },
    }).catch(() => null)   // slot may already be gone
  }

  if (status === "APPROVED")  await sendAssignmentConfirmation(appointment)
  if (status === "CANCELLED") await sendCancellationEmail(appointment)

  return Response.json({ data: appointment })
}
