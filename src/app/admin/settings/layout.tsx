import { auth } from "@/lib/auth"
import SettingsNav from "@/components/admin/SettingsNav"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role    = session?.user.role ?? "TENANT_ADMIN"

  return (
    <div className="space-y-1">
      <div>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage your clinic configuration.</p>
      </div>

      <div className="flex gap-6 pt-2">
        {/* Sub-nav */}
        <aside className="w-44 shrink-0">
          <div className="sticky top-24 overflow-hidden rounded-xl border border-border bg-white p-2 shadow-sm">
            <SettingsNav role={role} />
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}
