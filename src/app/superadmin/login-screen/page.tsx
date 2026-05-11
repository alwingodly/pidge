import LoginContentForm from "@/components/superadmin/LoginContentForm"
import { getPlatformLoginContent } from "@/lib/platform-login-content"

export default async function LoginScreenSettingsPage() {
  const content = await getPlatformLoginContent()

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Brand surface</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">Login screen</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Manage the left-side brand story, preview metrics, and trust note shown before users sign in.
        </p>
      </header>

      <LoginContentForm initial={content} />
    </div>
  )
}
