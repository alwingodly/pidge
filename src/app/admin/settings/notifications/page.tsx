import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { redirect } from "next/navigation"
import { Bell, Mail, Star } from "lucide-react"
import ReviewLinkForm from "@/components/admin/ReviewLinkForm"
import ReminderSettingsForm from "@/components/admin/ReminderSettingsForm"
import NotificationEmailForm from "@/components/admin/NotificationEmailForm"

export default async function NotificationsSettingsPage() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "TENANT_ADMIN") redirect("/admin")

  const { tenantId } = getScopeFromSession(session)

  const [tenant, tenantAdmin] = await Promise.all([
    prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: {
        reviewLink:           true,
        reminderEnabled:      true,
        reminderHoursBefore:  true,
        bookingAlertsEnabled: true,
        notificationEmail:    true,
      },
    }),
    prisma.adminUser.findFirst({
      where:  { tenantId, role: "TENANT_ADMIN" },
      select: { email: true },
    }),
  ])

  const defaultAlertEmail = tenantAdmin?.email ?? ""

  return (
    <div className="space-y-4">

      {/* Reminder emails */}
      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Bell className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Reminder emails</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Automatically remind patients before their upcoming appointment.
            </p>
          </div>
        </div>
        <div className="px-5 py-4">
          <ReminderSettingsForm
            initialEnabled={tenant?.reminderEnabled     ?? true}
            initialHoursBefore={tenant?.reminderHoursBefore ?? 24}
          />
        </div>
      </div>

      {/* Admin notification email */}
      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Mail className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">New booking alerts</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Where to send admin alerts when a new booking request arrives.
            </p>
          </div>
        </div>
        <div className="px-5 py-4">
          <NotificationEmailForm
            initialEnabled={tenant?.bookingAlertsEnabled ?? true}
            initialEmail={tenant?.notificationEmail ?? null}
            defaultEmail={defaultAlertEmail}
          />
        </div>
      </div>

      {/* Review requests */}
      <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Star className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Review requests</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Automatically email patients a review link when their appointment is marked as completed.
            </p>
          </div>
        </div>
        <div className="px-5 py-4">
          <ReviewLinkForm initialLink={tenant?.reviewLink ?? null} />
        </div>
      </div>

    </div>
  )
}
