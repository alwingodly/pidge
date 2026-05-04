import { cache } from "react"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"

const EMPTY_TENANT = {
  tenantId:     "",
  tenantSlug:   "",
  tenantName:   "",
  primaryColor: "#2563EB",
  logoUrl:      "",
  timezone:     "Europe/London",
  branchId:     null as string | null,
  branchSlug:   null as string | null,
}

// cache() deduplicates DB calls within a single request — same result whether
// called once in a layout or many times across nested server components.
export const getTenantFromHeaders = cache(async () => {
  const h    = await headers()
  const slug = h.get("x-tenant-slug")
  if (!slug) return EMPTY_TENANT

  const tenant = await prisma.tenant.findUnique({
    where: { slug, isActive: true },
  })
  if (!tenant) return EMPTY_TENANT

  const candidate = h.get("x-branch-slug-candidate")
  let branchId:   string | null = null
  let branchSlug: string | null = null

  if (candidate) {
    const branch = await prisma.branch.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: candidate }, isActive: true },
    })
    if (branch) { branchId = branch.id; branchSlug = branch.slug }
  }

  return {
    tenantId:     tenant.id,
    tenantSlug:   tenant.slug,
    tenantName:   tenant.name,
    primaryColor: tenant.primaryColor,
    logoUrl:      tenant.logoUrl ?? "",
    timezone:     tenant.timezone,
    branchId,
    branchSlug,
  }
})

export function getScopeFromSession(session: {
  user: { tenantId: string; branchId?: string | null; role: string }
}) {
  const { tenantId, role, branchId } = session.user
  return {
    tenantId,
    branchId: role === "BRANCH_ADMIN" ? (branchId ?? null) : null,
  }
}
