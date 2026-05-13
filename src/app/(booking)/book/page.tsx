import { prisma } from "@/lib/db"
import { getTenantFromHeaders } from "@/lib/tenant"
import BookingSteps from "@/components/booking/BookingSteps"
import { notFound } from "next/navigation"

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; doctorId?: string }>
}) {
  const { tenantId, branchId } = await getTenantFromHeaders()
  if (!tenantId) notFound()
  const sp = await searchParams
  const preServiceId = sp.serviceId ?? null
  const preDoctorId  = sp.doctorId  ?? null

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
      select: { showDoctorSelection: true, currencySymbol: true, gdprEnabled: true, onlinePaymentsEnabled: true },
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
      onlinePaymentsEnabled={tenant?.onlinePaymentsEnabled ?? false}
      preServiceId={preServiceId}
      preDoctorId={preDoctorId}
    />
  )
}
