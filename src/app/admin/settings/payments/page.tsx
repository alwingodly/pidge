import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { redirect } from "next/navigation"
import { CheckCircle2, CreditCard, XCircle } from "lucide-react"
import StripeConnectButton from "@/components/admin/StripeConnectButton"

export default async function PaymentsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string }>
}) {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "TENANT_ADMIN") redirect("/admin")

  const { tenantId } = getScopeFromSession(session)
  const { stripe: stripeParam } = await searchParams

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { stripeAccountId: true, stripeOnboarded: true },
  })

  const isConnected = tenant?.stripeOnboarded === true
  const isPending   = !!tenant?.stripeAccountId && !isConnected

  return (
    <div className="overflow-hidden rounded-xl border border-[#E8E3DC] bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-[#F3EAE0] px-5 py-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <CreditCard className="size-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Payments</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Connect your Stripe account so patients can pay online. Money goes directly to your account.
          </p>
        </div>
      </div>
      <div className="px-5 py-4">
        {isConnected ? (
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-foreground">Stripe connected</p>
              <p className="text-xs text-muted-foreground">
                Patient payments go directly to your Stripe account.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {stripeParam === "error" && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <XCircle className="size-4 shrink-0" />
                Something went wrong. Please try again.
              </div>
            )}
            {isPending && stripeParam !== "refresh" && (
              <p className="text-sm text-amber-700">
                Onboarding started but not completed. Click below to continue.
              </p>
            )}
            {stripeParam === "refresh" && (
              <p className="text-sm text-muted-foreground">
                Your setup link expired. Click below to get a new one.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Connect your Stripe account to accept payments. You&apos;ll be redirected to Stripe to complete
              setup — takes about 2 minutes.
            </p>
            <StripeConnectButton label={isPending ? "Continue Stripe setup" : "Connect Stripe"} />
          </div>
        )}
      </div>
    </div>
  )
}
