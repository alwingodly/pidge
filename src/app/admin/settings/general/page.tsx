import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { redirect } from "next/navigation"
import { Building2 } from "lucide-react"
import LogoUploadForm from "@/components/admin/LogoUploadForm"

export default async function GeneralSettingsPage() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "TENANT_ADMIN") redirect("/admin")

  const { tenantId } = getScopeFromSession(session)

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: {
      name: true, slug: true, businessType: true, country: true,
      timezone: true, currency: true, currencySymbol: true, logoUrl: true,
    },
  })

  return (
    <div className="space-y-4">
      <LogoUploadForm initialLogoUrl={tenant?.logoUrl ?? null} tenantName={tenant?.name ?? "Clinic"} />

      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Building2 className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">General</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Your clinic identity and regional settings.</p>
          </div>
        </div>
        <div className="divide-y divide-[#F3EAE0]">
          {[
            { label: "Clinic name",    value: tenant?.name          },
            { label: "Slug",           value: tenant?.slug          },
            { label: "Business type",  value: tenant?.businessType  },
            { label: "Country",        value: tenant?.country       },
            { label: "Timezone",       value: tenant?.timezone      },
            { label: "Currency",       value: `${tenant?.currency} (${tenant?.currencySymbol})` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4 px-5 py-3">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-right text-sm font-semibold text-foreground">{value ?? "—"}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-[#F3EAE0] px-5 py-3">
          <p className="text-xs text-muted-foreground">To update these details contact support.</p>
        </div>
      </div>
    </div>
  )
}
