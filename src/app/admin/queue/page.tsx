import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { decryptField } from "@/lib/encryption"
import WalkInQueue from "@/components/admin/WalkInQueue"

export default async function QueuePage() {
  const session = await auth()
  if (!session) return null
  const { tenantId, branchId } = getScopeFromSession(session)

  const [queue, doctors] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId,
        branchId:        branchId ?? undefined,
        status:          "CHECKED_IN",
        appointmentType: "WALK_IN",
      },
      include:  { service: true, doctor: true, branch: true },
      orderBy:  { checkedInAt: "asc" },
    }),
    prisma.doctor.findMany({
      where:   { tenantId, branchId: branchId ?? undefined, isActive: true },
      orderBy: { name: "asc" },
    }),
  ])

  const decryptedQueue = queue.map((a) => ({
    ...a,
    patientPhone: decryptField(a.patientPhone) ?? "",
  }))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Walk-in Queue</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {queue.length} patient{queue.length !== 1 ? "s" : ""} currently waiting
          <span className="ml-2 text-xs text-muted-foreground/60">· refreshes every 30 s</span>
        </p>
      </div>

      {/* Live queue */}
      <WalkInQueue initialQueue={decryptedQueue} doctors={doctors} />
    </div>
  )
}
