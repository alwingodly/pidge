import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Users } from "lucide-react"

export default async function TeamSettingsPage() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "TENANT_ADMIN") redirect("/admin")

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Users className="size-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Team</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage admin users and their access levels.
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
          <Users className="size-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">Coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Team management will be available here. Branch admins are managed per branch.
        </p>
      </div>
    </div>
  )
}
