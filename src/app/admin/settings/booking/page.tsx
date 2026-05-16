import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { Clock, Timer, X } from "lucide-react"
import ClinicHoursForm from "@/components/admin/ClinicHoursForm"
import SlotSettingsForm from "@/components/admin/SlotSettingsForm"
import PatientCancelForm from "@/components/admin/PatientCancelForm"

export default async function BookingSettingsPage() {
  const session = await auth()
  if (!session) return null

  const isTenantAdmin = session.user.role === "TENANT_ADMIN"
  const isBranchAdmin = session.user.role === "BRANCH_ADMIN"
  if (!isTenantAdmin && !isBranchAdmin) return null

  const { tenantId, branchId } = getScopeFromSession(session)

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { clinicStartTime: true, clinicEndTime: true, slotIntervalMins: true, lunchBreakStart: true, lunchBreakEnd: true, patientCancelEnabled: true },
  })

  // Branch admins see their branch overrides (falls back to tenant defaults if not set)
  let slotInterval   = tenant?.slotIntervalMins ?? 30
  let lunchBreakStart = tenant?.lunchBreakStart ?? null
  let lunchBreakEnd   = tenant?.lunchBreakEnd   ?? null

  if (branchId) {
    const branch = await prisma.branch.findUnique({
      where:  { id: branchId, tenantId },
      select: { slotIntervalMins: true, lunchBreakStart: true, lunchBreakEnd: true },
    })
    slotInterval    = branch?.slotIntervalMins ?? slotInterval
    lunchBreakStart = branch?.lunchBreakStart  ?? lunchBreakStart
    lunchBreakEnd   = branch?.lunchBreakEnd    ?? lunchBreakEnd
  }

  return (
    <div className="space-y-4">

      {/* Clinic hours — tenant admin only */}
      {isTenantAdmin && (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Clinic hours</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                General opening and closing time — shown to patients and used as the default working window for new doctors.
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
      )}

      {/* Appointment slot settings — both roles */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Timer className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Appointment slots</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isBranchAdmin
                ? "Set the slot interval and break time for your branch. Overrides the clinic-wide defaults."
                : "Set the default slot interval and break window used across all branches. Individual branches can override this."}
            </p>
          </div>
        </div>
        <div className="px-5 py-4">
          <SlotSettingsForm
            initialInterval={slotInterval}
            initialBreakStart={lunchBreakStart}
            initialBreakEnd={lunchBreakEnd}
            isBranchAdmin={isBranchAdmin}
          />
        </div>
      </div>

      {/* Patient self-cancellation — tenant admin only */}
      {isTenantAdmin && (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <X className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Patient self-cancellation</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Allow patients to cancel their own appointment via the link in their confirmation email.
                Turn off if you want all cancellations to go through your team.
              </p>
            </div>
          </div>
          <div className="px-5 py-4">
            <PatientCancelForm initialEnabled={tenant?.patientCancelEnabled ?? true} />
          </div>
        </div>
      )}

    </div>
  )
}
