import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { notFound } from "next/navigation"
import DoctorForm from "@/components/admin/DoctorForm"

export default async function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) return null
  const { tenantId, branchId } = getScopeFromSession(session)

  const isNew = id === "new"

  const [doctor, branches, services] = await Promise.all([
    isNew ? null : prisma.doctor.findUnique({
      where: { id, tenantId },
      include: { doctorServices: true },
    }),
    prisma.branch.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
  ])

  if (!isNew && !doctor) notFound()

  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-xl font-semibold text-foreground">{isNew ? "Add Doctor" : "Edit Doctor"}</h1>
      {services.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          You need to add <strong>services</strong> before adding a doctor. Go to{" "}
          <a href="/admin/services" className="underline font-medium">Services →</a>
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
    </div>
  )
}
