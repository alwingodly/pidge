import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { sendReminderEmail } from "@/lib/email"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch tenants that have reminders enabled, grouped by their hours-before setting
  const tenants = await prisma.tenant.findMany({
    where:  { isActive: true, reminderEnabled: true },
    select: { id: true, reminderHoursBefore: true },
  })

  // Group tenant IDs by the number of days ahead they want the reminder sent
  const byDays = new Map<number, string[]>()
  for (const t of tenants) {
    const days = Math.ceil(t.reminderHoursBefore / 24)
    if (!byDays.has(days)) byDays.set(days, [])
    byDays.get(days)!.push(t.id)
  }

  let totalSent = 0

  for (const [days, tenantIds] of byDays) {
    const target = new Date()
    target.setDate(target.getDate() + days)
    target.setHours(0, 0, 0, 0)
    const next = new Date(target)
    next.setDate(next.getDate() + 1)

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId:     { in: tenantIds },
        status:       "APPROVED",
        reminderSent: false,
        OR: [
          // Slot-based bookings
          { slot:         { date: { gte: target, lt: next } } },
          // Direct assignedDate bookings (slotId is null)
          { slotId: null, assignedDate: { gte: target, lt: next } },
        ],
      },
      include: { slot: true, doctor: true, service: true, tenant: true, branch: true },
    })

    for (const appt of appointments) {
      await sendReminderEmail(appt)
      await prisma.appointment.update({
        where: { id: appt.id },
        data:  { reminderSent: true },
      })
    }

    totalSent += appointments.length
  }

  return Response.json({ sent: totalSent })
}
