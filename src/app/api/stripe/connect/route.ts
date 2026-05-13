import { auth } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { getScopeFromSession } from "@/lib/tenant"

export const POST = auth(async (req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (req.auth.user.role !== "TENANT_ADMIN")
    return Response.json({ error: "Forbidden" }, { status: 403 })

  const { tenantId } = getScopeFromSession(req.auth)

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { stripeAccountId: true },
  })

  // Reuse existing account or create a new Express account
  let accountId = tenant?.stripeAccountId
  if (!accountId) {
    const account = await getStripe().accounts.create({ type: "express" })
    accountId = account.id
    await prisma.tenant.update({
      where: { id: tenantId },
      data:  { stripeAccountId: accountId },
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const accountLink = await getStripe().accountLinks.create({
    account:     accountId,
    refresh_url: `${appUrl}/admin/settings/payments?stripe=refresh`,
    return_url:  `${appUrl}/api/stripe/connect/callback`,
    type:        "account_onboarding",
  })

  return Response.json({ url: accountLink.url })
})
