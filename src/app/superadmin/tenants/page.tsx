import { prisma } from "@/lib/db"
import Link from "next/link"

export default async function TenantsPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { appointments: true, doctors: true } } },
  })

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Tenants</h1>
          <p className="text-xs text-muted-foreground">{tenants.length} total</p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-80 transition-opacity"
        >
          + Add
        </Link>
      </header>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        {tenants.length === 0 ? (
          <p className="px-4 py-10 text-sm text-center text-muted-foreground">No tenants yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {tenants.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.slug} · {t._count.doctors} dr · {t._count.appointments} bk · {t.currencySymbol} {t.currency}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{t.plan}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: t.isActive ? "var(--primary)" : "var(--muted-foreground)", opacity: t.isActive ? 1 : 0.4 }}
                  title={t.isActive ? "Active" : "Inactive"}
                />
                <Link
                  href={`/superadmin/tenants/${t.id}`}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
