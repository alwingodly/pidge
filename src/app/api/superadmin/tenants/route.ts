import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendWelcomeEmail } from "@/lib/email"
import { z } from "zod"
import bcrypt from "bcryptjs"

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-digit hex colour, e.g. #4996D7")

const createSchema = z.object({
  name:           z.string().min(1),
  slug:           z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  businessType:   z.enum(["CLINIC","AYURVEDA","DENTAL","PHYSIO"]).default("CLINIC"),
  country:        z.string().default("GB"),
  timezone:       z.string().default("Europe/London"),
  currency:       z.string().default("GBP"),
  currencySymbol: z.string().default("£"),
  plan:                z.enum(["FREE","BASIC","PRO"]).default("FREE"),
  primaryColor:        hexColor.default("#4996D7"),
  logoUrl:             z.url().optional(),
  isActive:            z.boolean().default(true),
  showDoctorSelection: z.boolean().default(false),
  manualBookingEnabled: z.boolean().default(false),
  patientHistoryEnabled: z.boolean().default(true),
  walkInEnabled: z.boolean().default(true),
  branchModeEnabled: z.boolean().default(false),
  adminName:           z.string().min(1),
  adminEmail:     z.email(),
  adminPass:      z.string().min(8),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  const { adminName, adminEmail, adminPass, ...tenantData } = parsed.data

  const existing = await prisma.tenant.findUnique({ where: { slug: tenantData.slug } })
  if (existing) return Response.json({ error: "Slug already taken" }, { status: 409 })

  const tenant = await prisma.tenant.create({ data: tenantData })

  const hashed = await bcrypt.hash(adminPass, 12)
  await prisma.adminUser.create({
    data: {
      tenantId: tenant.id,
      name:     adminName,
      email:    adminEmail,
      password: hashed,
      role:     "TENANT_ADMIN",
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://pikatym.io")
  const loginUrl = `${appUrl}/admin?__tenant=${encodeURIComponent(tenant.slug)}`
  await sendWelcomeEmail(adminName, adminEmail, adminPass, loginUrl, tenant.name)

  return Response.json({ data: tenant }, { status: 201 })
}
