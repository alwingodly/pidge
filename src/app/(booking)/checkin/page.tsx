import { prisma } from "@/lib/db"
import { getTenantFromHeaders } from "@/lib/tenant"
import WalkInForm from "@/components/booking/WalkInForm"
import { notFound } from "next/navigation"

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>
}) {
  const { tenantId, branchId, tenantName } = await getTenantFromHeaders()
  if (!tenantId) notFound()

  const sp              = await searchParams
  const branchSlugParam = sp.branch

  const [services, branches] = await Promise.all([
    prisma.service.findMany({
      where:   { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, durationMins: true, description: true },
    }),
    prisma.branch.findMany({
      where:   { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true, slug: true },
    }),
  ])

  // Priority: 1. ?branch= query param  2. header-resolved branch  3. only branch
  let defaultBranchId = branchId ?? (branches.length === 1 ? branches[0].id : null)
  if (branchSlugParam) {
    const matched = branches.find((b) => b.slug === branchSlugParam)
    if (matched) defaultBranchId = matched.id
  }

  return (
    <WalkInForm
      services={services}
      branches={branches}
      defaultBranchId={defaultBranchId}
      tenantName={tenantName}
    />
  )
}
