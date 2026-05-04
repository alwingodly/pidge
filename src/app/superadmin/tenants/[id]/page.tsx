import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import TenantForm from "@/components/admin/TenantForm"

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isNew = id === "new"

  const tenant = isNew ? null : await prisma.tenant.findUnique({
    where: { id },
    include: { adminUsers: { where: { role: "TENANT_ADMIN" }, take: 1 } },
  })

  if (!isNew && !tenant) notFound()

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-foreground">{isNew ? "Add Tenant" : `Manage ${tenant!.name}`}</h1>
      <TenantForm tenant={tenant} />
    </div>
  )
}
