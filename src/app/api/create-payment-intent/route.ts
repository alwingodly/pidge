import { NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { getTenantFromHeaders } from "@/lib/tenant"

export async function POST(req: NextRequest) {
  const { tenantId } = await getTenantFromHeaders()
  if (!tenantId) return Response.json({ error: "Tenant not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  const serviceId = body?.serviceId
  if (!serviceId) return Response.json({ error: "serviceId is required" }, { status: 400 })

  const branchId = body?.branchId as string | undefined

  const [service, tenant] = await Promise.all([
    prisma.service.findUnique({
      where:  { id: serviceId, tenantId, isActive: true },
      select: {
        price: true, name: true, priceOnConsultation: true,
        ...(branchId ? { branchConfigs: { where: { branchId }, select: { isOffered: true, isAvailable: true } } } : {}),
      },
    }),
    prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { currency: true, stripeAccountId: true, stripeOnboarded: true, onlinePaymentsEnabled: true },
    }),
  ])

  if (!tenant?.onlinePaymentsEnabled)
    return Response.json({ error: "Online payments are not enabled." }, { status: 400 })
  if (!service) return Response.json({ error: "Service not available." }, { status: 404 })
  if (service.priceOnConsultation) return Response.json({ error: "This service is priced on consultation." }, { status: 400 })
  if ((service.price ?? 0) <= 0) return Response.json({ error: "Service is free." }, { status: 400 })
  if (branchId && Array.isArray((service as {branchConfigs?: {isOffered:boolean;isAvailable:boolean}[]}).branchConfigs)) {
    const cfg = (service as {branchConfigs: {isOffered:boolean;isAvailable:boolean}[]}).branchConfigs[0]
    if (cfg && (!cfg.isOffered || !cfg.isAvailable))
      return Response.json({ error: "Service not available at this location." }, { status: 400 })
  }
  if (!tenant?.stripeAccountId || !tenant.stripeOnboarded)
    return Response.json({ error: "This clinic has not connected their payment account yet." }, { status: 400 })

  const paymentIntent = await getStripe().paymentIntents.create({
    amount:   Math.round((service.price ?? 0) * 100),
    currency: tenant.currency.toLowerCase() ?? "gbp",
    metadata: { serviceId, tenantId },
    payment_method_types: ["card", "link"],
    transfer_data: { destination: tenant.stripeAccountId },
  })

  return Response.json({ clientSecret: paymentIntent.client_secret })
}
