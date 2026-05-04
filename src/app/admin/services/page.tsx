import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import AddServiceDialog from "@/components/admin/AddServiceDialog"
import EditServiceDialog from "@/components/admin/EditServiceDialog"
import { Briefcase, Clock } from "lucide-react"

export default async function ServicesPage() {
  const session = await auth()
  if (!session) return null
  const { tenantId, branchId } = getScopeFromSession(session)
  const isTenantAdmin = session.user.role === "TENANT_ADMIN"

  const [services, branches] = await Promise.all([
    prisma.service.findMany({
      where:   { tenantId },
      orderBy: { name: "asc" },
      include: {
        _count:       { select: { appointments: true } },
        branchConfigs: { select: { branchId: true, isOffered: true, isAvailable: true } },
      },
    }),
    prisma.branch.findMany({
      where:   { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true },
    }),
  ])

  const activeCount = services.filter((s) => s.isActive).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Services</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {services.length} total · {activeCount} active
          </p>
        </div>
        {isTenantAdmin && <AddServiceDialog tenantId={tenantId} />}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F3EAE0] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-primary">
              <Briefcase className="size-3.5" />
            </div>
            <p className="text-sm font-bold text-foreground">Bookable services</p>
          </div>
          <span className="text-xs text-muted-foreground">{services.length} rows</span>
        </div>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <Briefcase className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">No services yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Use Add Service to create the first one.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3EAE0]">
            {services.map((service) => {
              // Summarise branch availability for display
              const unavailableCount = service.branchConfigs.filter((c) => c.isOffered && !c.isAvailable).length
              const notOfferedCount  = service.branchConfigs.filter((c) => !c.isOffered).length

              return (
                <div key={service.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{service.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                        service.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-muted text-muted-foreground ring-border"
                      }`}>
                        {service.isActive ? "Active" : "Inactive"}
                      </span>
                      {unavailableCount > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                          Unavailable at {unavailableCount} branch{unavailableCount !== 1 ? "es" : ""}
                        </span>
                      )}
                      {notOfferedCount > 0 && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border">
                          Not offered at {notOfferedCount} branch{notOfferedCount !== 1 ? "es" : ""}
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{service.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {service.durationMins} min
                      </span>
                      <span>{service._count.appointments} bookings</span>
                    </div>
                    <EditServiceDialog
                      service={service}
                      branches={branches}
                      isTenantAdmin={isTenantAdmin}
                      myBranchId={branchId}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
