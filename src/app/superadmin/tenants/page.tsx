import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function TenantsPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { appointments: true, doctors: true } } },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Tenants</h1>
        <Link href="/superadmin/tenants/new"><Button>Add Tenant</Button></Link>
      </div>

      <div className="bg-white rounded-xl border border-border divide-y divide-border">
        {tenants.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No tenants yet.</p>
        ) : tenants.map((tenant) => (
          <div key={tenant.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-foreground">{tenant.name}</p>
              <p className="text-sm text-muted-foreground">
                {tenant.slug} · {tenant.plan} ·{" "}
                <span className="font-mono">{tenant.currencySymbol} {tenant.currency}</span>
                {" "}· {tenant._count.doctors} practitioners · {tenant._count.appointments} bookings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full ${tenant.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                {tenant.isActive ? "Active" : "Inactive"}
              </span>
              <Link href={`/superadmin/tenants/${tenant.id}`} className="text-sm text-primary hover:underline">Manage</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
