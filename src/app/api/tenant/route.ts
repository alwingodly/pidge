import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"
import { z } from "zod"

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
const optionalText = (max: number) => z.string().max(max).or(z.literal("")).optional()

const patchSchema = z.object({
  clinicStartTime:     z.string().regex(timeRegex, "Must be HH:MM").optional(),
  clinicEndTime:       z.string().regex(timeRegex, "Must be HH:MM").optional(),
  reviewLink:          z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  reminderEnabled:      z.boolean().optional(),
  reminderHoursBefore:  z.number().int().min(1).max(168).optional(),
  bookingAlertsEnabled:   z.boolean().optional(),
  assignmentEmailEnabled: z.boolean().optional(),
  rescheduleEmailEnabled: z.boolean().optional(),
  notificationEmail:      z.string().email("Must be a valid email").or(z.literal("")).optional(),
  landingHeadline:       optionalText(80),
  landingSubheadline:    optionalText(220),
  landingPrimaryCta:     optionalText(32),
  landingSecondaryCta:   optionalText(32),
  landingTrustBadges:    optionalText(180),
  landingBottomHeadline: optionalText(80),
  landingBottomText:     optionalText(180),
})

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "TENANT_ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { tenantId } = getScopeFromSession(session)

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { clinicStartTime: true, clinicEndTime: true },
  })
  return Response.json({ data: tenant })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "TENANT_ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { tenantId } = getScopeFromSession(session)

  const body   = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  // Validate start < end when both are provided
  const { clinicStartTime, clinicEndTime } = parsed.data
  if (clinicStartTime && clinicEndTime && clinicStartTime >= clinicEndTime) {
    return Response.json({ error: "Opening time must be before closing time" }, { status: 400 })
  }

  const {
    reviewLink,
    notificationEmail,
    landingHeadline,
    landingSubheadline,
    landingPrimaryCta,
    landingSecondaryCta,
    landingTrustBadges,
    landingBottomHeadline,
    landingBottomText,
    ...rest
  } = parsed.data
  const tenant = await prisma.tenant.update({
    where:  { id: tenantId },
    data:   {
      ...rest,
      ...(reviewLink        !== undefined ? { reviewLink:        reviewLink        || null } : {}),
      ...(notificationEmail !== undefined ? { notificationEmail: notificationEmail || null } : {}),
      ...(landingHeadline       !== undefined ? { landingHeadline:       landingHeadline.trim()       || null } : {}),
      ...(landingSubheadline    !== undefined ? { landingSubheadline:    landingSubheadline.trim()    || null } : {}),
      ...(landingPrimaryCta     !== undefined ? { landingPrimaryCta:     landingPrimaryCta.trim()     || null } : {}),
      ...(landingSecondaryCta   !== undefined ? { landingSecondaryCta:   landingSecondaryCta.trim()   || null } : {}),
      ...(landingTrustBadges    !== undefined ? { landingTrustBadges:    landingTrustBadges.trim()    || null } : {}),
      ...(landingBottomHeadline !== undefined ? { landingBottomHeadline: landingBottomHeadline.trim() || null } : {}),
      ...(landingBottomText     !== undefined ? { landingBottomText:     landingBottomText.trim()     || null } : {}),
    },
    select: {
      clinicStartTime:        true,
      clinicEndTime:          true,
      reviewLink:             true,
      reminderEnabled:        true,
      reminderHoursBefore:    true,
      bookingAlertsEnabled:   true,
      assignmentEmailEnabled: true,
      rescheduleEmailEnabled: true,
      notificationEmail:      true,
      landingHeadline:        true,
      landingSubheadline:     true,
      landingPrimaryCta:      true,
      landingSecondaryCta:    true,
      landingTrustBadges:     true,
      landingBottomHeadline:  true,
      landingBottomText:      true,
    },
  })
  return Response.json({ data: tenant })
}
