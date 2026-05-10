import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import TenantForm from "@/components/admin/TenantForm"
import Link from "next/link"
import { ArrowLeft, Building2, CalendarDays, Stethoscope, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ComponentType } from "react"

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isNew = id === "new"

  const tenant = isNew ? null : await prisma.tenant.findUnique({
    where: { id },
    include: {
      adminUsers: {
        where: { role: "TENANT_ADMIN" },
        take: 1,
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { appointments: true, doctors: true, branches: true } },
    },
  })

  if (!isNew && !tenant) notFound()

  const admin = tenant?.adminUsers[0]

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-5 border-b border-border px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 justify-start px-2 text-xs text-muted-foreground">
              <Link href="/superadmin/tenants">
                <ArrowLeft className="size-3.5" />
                Tenants
              </Link>
            </Button>

            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                    {isNew ? "Create tenant" : tenant!.name}
                  </h1>
                  {!isNew && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      tenant!.isActive
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-muted text-muted-foreground ring-border"
                    }`}>
                      {tenant!.isActive ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isNew
                    ? "Set up clinic details, admin access, and platform features."
                    : `${tenant!.slug} · ${tenant!.businessType.toLowerCase()} · ${tenant!.plan}`}
                </p>
              </div>
            </div>
          </div>

          {!isNew && (
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-secondary/40 text-center sm:w-[330px]">
              <Metric icon={Stethoscope} label="Doctors" value={tenant!._count.doctors} />
              <Metric icon={CalendarDays} label="Bookings" value={tenant!._count.appointments} />
              <Metric icon={Building2} label="Branches" value={tenant!._count.branches} />
            </div>
          )}
        </div>

        {!isNew && (
          <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
            <Summary label="Primary admin" value={admin?.name ?? "Not assigned"} helper={admin?.email} icon={UserRound} />
            <Summary label="Region" value={`${tenant!.country} · ${tenant!.timezone}`} />
            <Summary label="Billing currency" value={`${tenant!.currencySymbol} ${tenant!.currency}`} helper={tenant!.plan} />
          </div>
        )}
      </header>

      <TenantForm tenant={tenant} />
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="border-r border-border px-3 py-3 last:border-r-0">
      <Icon className="mx-auto mb-1 size-4 text-primary" />
      <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

function Summary({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper?: string | null
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5">
      {Icon && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
          <Icon className="size-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
        {helper && <p className="truncate text-xs text-muted-foreground">{helper}</p>}
      </div>
    </div>
  )
}
