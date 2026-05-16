import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { tenantId, branchId } = getScopeFromSession(session)
  const { id } = await params

  const slot = await prisma.slot.findUnique({ where: { id, tenantId, ...(branchId ? { branchId } : {}) } })
  if (!slot)          return Response.json({ error: "Slot not found" }, { status: 404 })
  if (slot.isBooked)  return Response.json({ error: "Cannot delete a booked slot" }, { status: 409 })

  await prisma.slot.delete({ where: { id } })
  return Response.json({ success: true })
}
