import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { sendCancellationEmail } from "@/lib/email"
import { formatDate, formatTime } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token   = searchParams.get("token")
  const preview = searchParams.get("preview")

  if (!token) return Response.json({ error: "Invalid link" }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { cancelToken: token },
    include: { slot: true, service: true, doctor: true, tenant: true },
  })

  if (!appointment) return Response.json({ error: "Booking not found" }, { status: 404 })
  if (appointment.status === "CANCELLED") return Response.json({ error: "Already cancelled" }, { status: 400 })

  if (preview) {
    const dateStr = appointment.assignedDate
      ? formatDate(appointment.assignedDate)
      : appointment.slot ? formatDate(appointment.slot.date)
      : appointment.preferredDate ? formatDate(appointment.preferredDate)
      : "To be confirmed"

    const timeStr = appointment.assignedTime
      ?? (appointment.slot ? formatTime(appointment.slot.startTime) : null)

    return Response.json({
      bookingRef:  appointment.bookingRef,
      patientName: appointment.patientName,
      doctor:      appointment.doctor?.name ?? "To be assigned",
      service:     appointment.service.name,
      date:        dateStr,
      time:        timeStr ?? "To be confirmed",
    })
  }

  return Response.json({ error: "Use DELETE to cancel" }, { status: 405 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  if (!token) return Response.json({ error: "Invalid link" }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { cancelToken: token },
    include: { slot: true, service: true, doctor: true, tenant: true },
  })

  if (!appointment) return Response.json({ error: "Booking not found" }, { status: 404 })
  if (appointment.status === "CANCELLED") return Response.json({ error: "Already cancelled" }, { status: 400 })

  // Update appointment status; free the slot only if one exists (legacy flow)
  await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELLED" } })

  if (appointment.slotId) {
    await prisma.slot.update({ where: { id: appointment.slotId }, data: { isBooked: false } }).catch(() => null)
  }

  await sendCancellationEmail(appointment)
  return Response.json({ success: true, bookingRef: appointment.bookingRef })
}
