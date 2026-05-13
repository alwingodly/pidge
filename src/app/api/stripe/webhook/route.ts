import { NextRequest } from "next/server"
import Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get("stripe-signature")

  if (!sig) return Response.json({ error: "Missing signature" }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return Response.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  switch (event.type) {

    // ── Clinic completed (or updated) their Stripe onboarding ──────────────────
    case "account.updated": {
      const account = event.data.object as Stripe.Account
      if (account.details_submitted) {
        await prisma.tenant.updateMany({
          where: { stripeAccountId: account.id },
          data:  { stripeOnboarded: true },
        })
      }
      break
    }

    // ── Patient payment confirmed ───────────────────────────────────────────────
    // Appointment is created client-side after getStripe().confirmPayment() returns.
    // This webhook acts as a safety net: if the client fails after payment,
    // re-enable full appointment creation here using paymentIntent.metadata.
    case "payment_intent.succeeded": {
      // const pi = event.data.object as Stripe.PaymentIntent
      // TODO: implement fallback appointment creation from pi.metadata
      //       when Stripe payments are re-enabled in BookingSteps.tsx
      break
    }

    default:
      break
  }

  return Response.json({ received: true })
}
