import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { decryptField } from "@/lib/encryption"
import PatientsList from "@/components/admin/PatientsList"

export default async function PatientsPage() {
  const session = await auth()
  if (!session) return null

  const { tenantId, branchId } = getScopeFromSession(session)

  const [distinctPatients, grouped] = await Promise.all([
    prisma.appointment.findMany({
      where:    { tenantId, ...(branchId ? { branchId } : {}) },
      select:   { patientEmail: true, patientName: true, patientSurname: true, patientPhone: true },
      orderBy:  { createdAt: "desc" },
      distinct: ["patientEmail"],
    }),
    prisma.appointment.groupBy({
      by:     ["patientEmail"],
      where:  { tenantId, ...(branchId ? { branchId } : {}) },
      _count: { _all: true },
      _max:   { createdAt: true },
    }),
  ])

  const statsMap = new Map(grouped.map((g) => [
    g.patientEmail,
    { count: g._count._all, lastSeen: g._max.createdAt },
  ]))

  const patients = distinctPatients
    .filter((a) => a.patientName !== "[deleted]" && !a.patientEmail.endsWith("@deleted.invalid"))
    .map((a) => {
      let phone = "—"
      try { phone = decryptField(a.patientPhone) ?? "—" } catch { /* key mismatch */ }
      const stats = statsMap.get(a.patientEmail)
      return {
        email:    a.patientEmail,
        name:     [a.patientName, a.patientSurname].filter(Boolean).join(" "),
        phone,
        count:    stats?.count ?? 1,
        lastSeen: stats?.lastSeen ?? null,
      }
    })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Patients</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Everyone who has booked through your clinic.</p>
      </div>
      <PatientsList patients={patients} />
    </div>
  )
}
