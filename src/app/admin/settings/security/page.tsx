import { auth } from "@/lib/auth"
import { KeyRound } from "lucide-react"
import ChangePasswordForm from "@/components/admin/ChangePasswordForm"

export default async function SecuritySettingsPage() {
  const session = await auth()
  if (!session) return null

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <KeyRound className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Change password</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Update the password for <span className="font-medium">{session.user.email}</span>.
            </p>
          </div>
        </div>
        <div className="px-5 py-4">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  )
}
