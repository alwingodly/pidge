import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { notFound } from "next/navigation"
import DoctorForm from "@/components/admin/DoctorForm"
import DoctorLeaveManager from "@/components/admin/DoctorLeaveManager"

export default async function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) return null
  const { tenantId, branchId } = getScopeFromSession(session)

  const isNew = id === "new"

  const [doctor, branches, services, leaves] = await Promise.all([
    isNew ? null : prisma.doctor.findUnique({
      where:   { id, tenantId },
      include: { doctorServices: true },
    }),
    prisma.branch.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
    isNew ? [] : prisma.doctorLeave.findMany({
      where:   { doctorId: id, tenantId },
      orderBy: { startDate: "asc" },
    }),
  ])

  if (!isNew && !doctor) notFound()

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-foreground">{isNew ? "Add Doctor" : "Edit Doctor"}</h1>
      {services.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You need to add <strong>services</strong> before adding a doctor. Go to{" "}
          <a href="/admin/services" className="font-medium underline">Services →</a>
        </div>
      )}
      <DoctorForm
        doctor={doctor}
        branches={branches}
        services={services}
        tenantId={tenantId}
        defaultBranchId={branchId}
        isBranchAdmin={session.user.role === "BRANCH_ADMIN"}
      />
      {!isNew && doctor && (
        <DoctorLeaveManager
          doctorId={doctor.id}
          doctorName={doctor.name}
          initialLeaves={leaves.map(l => ({
            id:        l.id,
            startDate: l.startDate.toISOString().slice(0, 10),
            endDate:   l.endDate.toISOString().slice(0, 10),
            reason:    l.reason ?? null,
          }))}
        />
      )}
    </div>
  )
}
