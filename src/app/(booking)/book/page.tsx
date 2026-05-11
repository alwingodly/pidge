import { prisma } from "@/lib/db"
import { getTenantFromHeaders } from "@/lib/tenant"
import BookingSteps from "@/components/booking/BookingSteps"
import { notFound } from "next/navigation"

export default async function BookPage() {
  const { tenantId, branchId } = await getTenantFromHeaders()
  if (!tenantId) notFound()

  const [services, branches, tenant] = await Promise.all([
    prisma.service.findMany({
      where:   { tenantId, isActive: true },
      orderBy: { name: "asc" },
      include: { branchConfigs: { select: { branchId: true, isOffered: true, isAvailable: true } } },
    }),
    prisma.branch.findMany({
      where:   { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, address: true },
    }),
    prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { showDoctorSelection: true, currencySymbol: true, gdprEnabled: true },
    }),
  ])

  const defaultBranchId = branchId ?? (branches.length === 1 ? branches[0].id : null)

  return (
    <BookingSteps
      services={services}
      branches={branches}
      defaultBranchId={defaultBranchId}
      showDoctorSelection={tenant?.showDoctorSelection ?? false}
      currencySymbol={tenant?.currencySymbol ?? "£"}
      gdprEnabled={tenant?.gdprEnabled ?? false}
    />
  )
}
