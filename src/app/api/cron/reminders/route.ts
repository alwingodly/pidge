import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { sendReminderEmail } from "@/lib/email"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const appointments = await prisma.appointment.findMany({
    where: {
      status:       "APPROVED",
      reminderSent: false,
      slot: { date: { gte: tomorrow, lt: dayAfter } },
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

  return Response.json({ sent: appointments.length })
}
