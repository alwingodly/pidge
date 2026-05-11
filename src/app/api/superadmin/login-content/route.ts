import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PLATFORM_LOGIN_CONTENT_ID } from "@/lib/platform-login-content"
import { z } from "zod"

const text = (max: number) => z.string().trim().min(1).max(max)

const loginContentSchema = z.object({
  eyebrow: text(48),
  headline: text(96),
  description: text(220),
  panelLabel: text(32),
  statusLabel: text(32),
  metricOneLabel: text(24),
  metricOneValue: text(16),
  metricTwoLabel: text(24),
  metricTwoValue: text(16),
  metricThreeLabel: text(24),
  metricThreeValue: text(16),
  footerNote: text(140),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = loginContentSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  }

  const content = await prisma.platformLoginContent.upsert({
    where: { id: PLATFORM_LOGIN_CONTENT_ID },
    create: {
      id: PLATFORM_LOGIN_CONTENT_ID,
      ...parsed.data,
    },
    update: parsed.data,
  })

  return Response.json({ ok: true, content })
}
