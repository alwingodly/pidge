import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import LandingCopyForm from "@/components/admin/LandingCopyForm"

export default async function LandingSettingsPage() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "TENANT_ADMIN") redirect("/admin")

  const { tenantId } = getScopeFromSession(session)

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      landingHeadline:       true,
      landingSubheadline:    true,
      landingPrimaryCta:     true,
      landingSecondaryCta:   true,
      landingTrustBadges:    true,
      landingBottomHeadline: true,
      landingBottomText:     true,
    },
  })

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <FileText className="size-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Landing page copy</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Personalize patient-facing wording while keeping the page layout consistent.
          </p>
        </div>
      </div>
      <div className="px-5 py-4">
        <LandingCopyForm
          initial={{
            landingHeadline:       tenant?.landingHeadline       ?? null,
            landingSubheadline:    tenant?.landingSubheadline    ?? null,
            landingPrimaryCta:     tenant?.landingPrimaryCta     ?? null,
            landingSecondaryCta:   tenant?.landingSecondaryCta   ?? null,
            landingTrustBadges:    tenant?.landingTrustBadges    ?? null,
            landingBottomHeadline: tenant?.landingBottomHeadline ?? null,
            landingBottomText:     tenant?.landingBottomText     ?? null,
          }}
        />
      </div>
    </div>
  )
}
