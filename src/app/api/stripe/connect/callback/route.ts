import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { getScopeFromSession } from "@/lib/tenant"
import { redirect } from "next/navigation"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!
    return Response.redirect(`${appUrl}/admin/settings?stripe=error`)
  }

  const { tenantId } = getScopeFromSession(session)

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { stripeAccountId: true },
  })

  if (tenant?.stripeAccountId) {
    const account = await getStripe().accounts.retrieve(tenant.stripeAccountId)
    if (account.details_submitted) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data:  { stripeOnboarded: true },
      })
    }
  }

  redirect("/admin/settings/payments?stripe=success")
}
