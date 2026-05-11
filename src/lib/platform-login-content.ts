import { prisma } from "@/lib/db"

export const PLATFORM_LOGIN_CONTENT_ID = "default"

export type PlatformLoginContentView = {
  eyebrow: string
  headline: string
  description: string
  panelLabel: string
  statusLabel: string
  metricOneLabel: string
  metricOneValue: string
  metricTwoLabel: string
  metricTwoValue: string
  metricThreeLabel: string
  metricThreeValue: string
  footerNote: string
}

export const DEFAULT_PLATFORM_LOGIN_CONTENT: PlatformLoginContentView = {
  eyebrow: "SaaS operating console",
  headline: "Serious operations, surprisingly human.",
  description: "A calm command center for tenant growth, clinic workflows, bookings, and access control.",
  panelLabel: "Today",
  statusLabel: "Healthy",
  metricOneLabel: "Tenants",
  metricOneValue: "28",
  metricTwoLabel: "Bookings",
  metricTwoValue: "846",
  metricThreeLabel: "Pending",
  metricThreeValue: "12",
  footerNote: "Protected console access for super admins and clinic teams.",
}

export async function getPlatformLoginContent(): Promise<PlatformLoginContentView> {
  try {
    const content = await prisma.platformLoginContent.findUnique({
      where: { id: PLATFORM_LOGIN_CONTENT_ID },
    })
    if (!content) return DEFAULT_PLATFORM_LOGIN_CONTENT

    return {
      eyebrow: content.eyebrow,
      headline: content.headline,
      description: content.description,
      panelLabel: content.panelLabel,
      statusLabel: content.statusLabel,
      metricOneLabel: content.metricOneLabel,
      metricOneValue: content.metricOneValue,
      metricTwoLabel: content.metricTwoLabel,
      metricTwoValue: content.metricTwoValue,
      metricThreeLabel: content.metricThreeLabel,
      metricThreeValue: content.metricThreeValue,
      footerNote: content.footerNote,
    }
  } catch {
    return DEFAULT_PLATFORM_LOGIN_CONTENT
  }
}
