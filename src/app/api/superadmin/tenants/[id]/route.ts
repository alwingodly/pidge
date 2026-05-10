import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateSchema = z.object({
  name:           z.string().min(1).optional(),
  slug:           z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes").optional(),
  businessType:   z.string().optional(),
  country:        z.string().optional(),
  timezone:       z.string().optional(),
  currency:       z.string().optional(),
  currencySymbol: z.string().optional(),
  plan:           z.enum(["FREE","BASIC","PRO"]).optional(),
  primaryColor:   z.string().optional(),
  logoUrl:        z.url().optional(),
  isActive:            z.boolean().optional(),
  showDoctorSelection: z.boolean().optional(),
  manualBookingEnabled: z.boolean().optional(),
  patientHistoryEnabled: z.boolean().optional(),
  walkInEnabled: z.boolean().optional(),
  branchModeEnabled: z.boolean().optional(),
  adminName:           z.string().optional(),
  adminEmail:     z.email().optional(),
  adminPass:      z.string().min(8).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body   = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 })

  const { adminName, adminEmail, adminPass, ...tenantData } = parsed.data

  if (tenantData.slug) {
    const existing = await prisma.tenant.findUnique({ where: { slug: tenantData.slug } })
    if (existing && existing.id !== id) return Response.json({ error: "Slug already taken" }, { status: 409 })
  }

  const tenant = await prisma.tenant.update({
    where: { id },
    data:  tenantData,
  })

  if (adminEmail || adminName || adminPass) {
    const existing = await prisma.adminUser.findFirst({
      where: { tenantId: id, role: "TENANT_ADMIN" },
    })
    if (existing) {
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: {
          ...(adminName  ? { name:  adminName }               : {}),
          ...(adminEmail ? { email: adminEmail }              : {}),
          ...(adminPass  ? { password: await bcrypt.hash(adminPass, 12) } : {}),
        },
      })
    }
  }

  return Response.json({ data: tenant })
}
