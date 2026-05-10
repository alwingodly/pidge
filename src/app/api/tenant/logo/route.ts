import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getScopeFromSession } from "@/lib/tenant"

const MAX_LOGO_BYTES = 750 * 1024
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "TENANT_ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { tenantId } = getScopeFromSession(session)
  const form = await req.formData()
  const file = form.get("logo")

  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a logo image to upload." }, { status: 400 })
  }

  if (!LOGO_TYPES.has(file.type)) {
    return Response.json({ error: "Logo must be a PNG, JPG, or WebP image." }, { status: 400 })
  }

  if (file.size > MAX_LOGO_BYTES) {
    return Response.json({ error: "Logo must be 750 KB or smaller." }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const logoUrl = `data:${file.type};base64,${bytes.toString("base64")}`
  await prisma.tenant.update({
    where: { id: tenantId },
    data:  { logoUrl },
  })

  return Response.json({ data: { logoUrl } })
}

export async function DELETE() {
  const session = await auth()
  if (!session || session.user.role !== "TENANT_ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { tenantId } = getScopeFromSession(session)
  await prisma.tenant.update({
    where: { id: tenantId },
    data:  { logoUrl: null },
  })

  return Response.json({ data: { logoUrl: null } })
}
