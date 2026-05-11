import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { redirect } from "next/navigation"
import { Clock } from "lucide-react"
import ClinicHoursForm from "@/components/admin/ClinicHoursForm"

export default async function BookingSettingsPage() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "TENANT_ADMIN") redirect("/admin")

  const { tenantId } = getScopeFromSession(session)

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { clinicStartTime: true, clinicEndTime: true },
  })

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Clock className="size-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Clinic hours</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The general opening and closing time shown to patients and used as the default working window.
          </p>
        </div>
      </div>
      <div className="px-5 py-4">
        <ClinicHoursForm
          initialStart={tenant?.clinicStartTime ?? null}
          initialEnd={tenant?.clinicEndTime   ?? null}
        />
      </div>
    </div>
  )
}
