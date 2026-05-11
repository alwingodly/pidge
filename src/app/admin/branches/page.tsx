import QRCode from "qrcode"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import AddBranchDialog from "@/components/admin/AddBranchDialog"
import ManageBranchDialog from "@/components/admin/ManageBranchDialog"
import { CalendarDays, GitBranch, Users } from "lucide-react"
import { notFound } from "next/navigation"
import { tenantUrl } from "@/lib/app-url"

export default async function BranchesPage() {
  const session = await auth()
  if (!session) return null
  const { tenantId } = getScopeFromSession(session)

  const isTenantAdmin = session.user.role === "TENANT_ADMIN"

  const [branches, tenant] = await Promise.all([
    prisma.branch.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { doctors: true, appointments: true } },
        adminUsers: {
          where: { role: "BRANCH_ADMIN", isActive: true },
          select: { id: true, name: true, email: true, isActive: true },
        },
      },
    }),
    prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { slug: true, branchModeEnabled: true },
    }),
  ])
  if (!tenant?.branchModeEnabled) notFound()

  const branchesWithQR = await Promise.all(
    branches.map(async (b) => {
      const checkinUrl = tenantUrl(tenant.slug, "/checkin", { branch: b.slug })
      const qrDataUrl  = await QRCode.toDataURL(checkinUrl, {
        width: 200, margin: 2, color: { dark: "#1C1007", light: "#FFFFFF" },
      })
      return { ...b, checkinUrl, qrDataUrl }
    })
  )

  const activeCount = branchesWithQR.filter((b) => b.isActive).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Branches</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {branchesWithQR.length} total · {activeCount} active
          </p>
        </div>
        {isTenantAdmin && <AddBranchDialog tenantId={tenantId} />}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-primary">
              <GitBranch className="size-3.5" />
            </div>
            <p className="text-sm font-bold text-foreground">Locations</p>
          </div>
          <span className="text-xs text-muted-foreground">{branchesWithQR.length} rows</span>
        </div>

        {branchesWithQR.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <GitBranch className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">No branches yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Use Add Branch to create the first location.</p>
            {isTenantAdmin && (
              <div className="mt-4">
                <AddBranchDialog tenantId={tenantId} />
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#F3EAE0]">
            {branchesWithQR.map((branch) => (
              <div
                key={branch.id}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{branch.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                      branch.isActive
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-muted text-muted-foreground ring-border"
                    }`}>
                      {branch.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {branch.address && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{branch.address}</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {branch._count.appointments} appt{branch._count.appointments !== 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" />
                      {branch.adminUsers.length} admin{branch.adminUsers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {isTenantAdmin && (
                    <ManageBranchDialog
                      branch={branch}
                      checkinUrl={branch.checkinUrl}
                      qrDataUrl={branch.qrDataUrl}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
