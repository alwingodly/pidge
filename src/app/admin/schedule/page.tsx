import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DayCalendar from "@/components/admin/DayCalendar"

export default async function SchedulePage() {
  const session = await auth()
  if (!session) redirect("/admin/login")

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Schedule</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Daily appointments and clinician availability.
          </p>
        </div>
      </div>

      <DayCalendar isTenantAdmin={session.user.role === "TENANT_ADMIN"} />
    </div>
  )
}
