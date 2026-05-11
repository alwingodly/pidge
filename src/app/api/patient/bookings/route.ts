import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { getTenantFromHeaders } from "@/lib/tenant"
import { verifyBookingToken } from "@/lib/encryption"
import { formatDate, formatTime } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantFromHeaders()
  if (!tenantId) return Response.json({ error: "Tenant not found" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  if (!token || !email) {
    return Response.json({ error: "Invalid session." }, { status: 401 })
  }

  if (!verifyBookingToken(token, email)) {
    return Response.json({ error: "Session expired. Please verify your email again." }, { status: 401 })
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      patientEmail: email,
      status:       { not: "CANCELLED" },
    },
    include: {
      service: { select: { name: true, durationMins: true } },
      doctor:  { select: { name: true } },
      branch:  { select: { name: true, address: true } },
      tenant:  { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  const data = appointments.map((a) => {
    const dateStr = a.assignedDate
      ? formatDate(a.assignedDate)
      : a.preferredDate
      ? formatDate(a.preferredDate)
      : "To be confirmed"

    const timeStr = a.assignedTime ?? "To be confirmed"

    return {
      bookingRef:   a.bookingRef,
      cancelToken:  a.cancelToken,
      status:       a.status,
      service:      a.service.name,
      duration:     a.service.durationMins,
      doctor:       a.doctor?.name ?? null,
      clinic:       a.tenant.name,
      branch:       a.branch?.name ?? null,
      address:      a.branch?.address ?? null,
      date:         dateStr,
      time:         timeStr,
      isAssigned:   !!(a.assignedDate || a.assignedTime || a.slotId),
      createdAt:    a.createdAt.toISOString(),
    }
  })

  return Response.json({ data })
}
