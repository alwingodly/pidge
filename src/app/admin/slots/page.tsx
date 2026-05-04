import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import SlotManager from "@/components/admin/SlotManager"

export default async function SlotsPage() {
  const session = await auth()
  if (!session) return null
  const { tenantId, branchId } = getScopeFromSession(session)

  const doctors = await prisma.doctor.findMany({
    where:   { tenantId, branchId: branchId ?? undefined, isActive: true },
    orderBy: { name: "asc" },
    include: {
      doctorServices: {
        include: { service: { select: { id: true, name: true, durationMins: true } } },
      },
    },
  })

  // Flatten to a shape SlotManager can consume
  const doctorsWithServices = doctors.map((d) => ({
    id:         d.id,
    name:       d.name,
    speciality: d.speciality,
    services:   d.doctorServices.map((ds) => ds.service),
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Slots</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage doctor availability — create time slots that patients can book.
        </p>
      </div>
      <SlotManager doctors={doctorsWithServices} />
    </div>
  )
}
